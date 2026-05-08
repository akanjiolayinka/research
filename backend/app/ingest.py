from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any, Iterable

import httpx
import trafilatura
from pypdf import PdfReader

from .config import get_settings
from .embeddings import embed
from .vectorstore import existing_ids, upsert

# Sentence boundary: end-of-sentence punctuation followed by whitespace and an
# uppercase letter or quote. Lookbehinds keep the punctuation with the sentence.
_SENT_RE = re.compile(r'(?<=[.!?])(?=\s+["\'(\[]?[A-Z0-9])')
_PARAGRAPH_RE = re.compile(r"\n\s*\n+")


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n\n".join((page.extract_text() or "") for page in reader.pages)


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _read_url(url: str) -> str:
    resp = httpx.get(
        url,
        timeout=30,
        follow_redirects=True,
        headers={"User-Agent": "rag-chatbot/0.2"},
    )
    resp.raise_for_status()
    extracted = trafilatura.extract(resp.text, include_comments=False, include_tables=False)
    return extracted or resp.text


def load_source(source: str | Path) -> tuple[str, str]:
    """Return (source_id, raw_text). source_id is a stable name used in citations."""
    s = str(source)
    if s.startswith("http://") or s.startswith("https://"):
        return s, _read_url(s)

    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Source not found: {source}")
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return path.name, _read_pdf(path)
    if suffix in {".md", ".markdown", ".txt", ".rst"}:
        return path.name, _read_text(path)
    raise ValueError(f"Unsupported file type: {suffix}")


def split_sentences(paragraph: str) -> list[str]:
    """Approximate sentence splitter. Avoids depending on nltk so there's no
    one-time data download at first run."""
    paragraph = paragraph.strip()
    if not paragraph:
        return []
    parts = _SENT_RE.split(paragraph)
    return [p.strip() for p in parts if p.strip()]


def _pack_paragraph(
    paragraph: str, chunk_size: int, overlap: int
) -> list[str]:
    sentences = split_sentences(paragraph)
    if not sentences:
        return []
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent) + 1  # +1 for the joining space
        # If a single sentence is bigger than the soft ceiling, emit it on its
        # own — never split mid-sentence.
        if sent_len > chunk_size and not current:
            chunks.append(sent)
            continue
        if current_len + sent_len > chunk_size and current:
            chunks.append(" ".join(current))
            # Carry trailing sentences whose total length fits within `overlap`.
            carry: list[str] = []
            carry_len = 0
            for s in reversed(current):
                if carry_len + len(s) + 1 > overlap:
                    break
                carry.insert(0, s)
                carry_len += len(s) + 1
            current = carry
            current_len = carry_len
        current.append(sent)
        current_len += sent_len
    if current:
        chunks.append(" ".join(current))
    return chunks


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[str]:
    """Split `text` into chunks that:
      • respect paragraph breaks as hard split points,
      • never split mid-sentence,
      • stay under `chunk_size` characters as a soft ceiling,
      • carry up to `overlap` characters of trailing sentences across boundaries.
    """
    settings = get_settings()
    chunk_size = chunk_size if chunk_size is not None else settings.chunk_size
    overlap = overlap if overlap is not None else settings.chunk_overlap
    if not text or not text.strip():
        return []

    chunks: list[str] = []
    for paragraph in _PARAGRAPH_RE.split(text):
        chunks.extend(_pack_paragraph(paragraph, chunk_size, overlap))
    return [c.strip() for c in chunks if c.strip()]


def chunk_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _vector_id(source_id: str, content_hash: str) -> str:
    """Vector id = first 16 hex of sha256(source + content). Stable + dedup-friendly."""
    return hashlib.sha1(f"{source_id}::{content_hash}".encode("utf-8")).hexdigest()[:24]


def ingest_source(source: str | Path, namespace: str | None = None) -> dict:
    source_id, text = load_source(source)
    return _ingest_text(source_id, text, namespace=namespace)


def ingest_text(source_id: str, text: str, namespace: str | None = None) -> dict:
    return _ingest_text(source_id, text, namespace=namespace)


def _ingest_text(source_id: str, text: str, namespace: str | None) -> dict:
    chunks = chunk_text(text)
    total = len(chunks)
    if total == 0:
        return {
            "source": source_id,
            "total_chunks": 0,
            "new_chunks": 0,
            "skipped_chunks": 0,
            "upserted": 0,
            "chunks": 0,  # legacy field for old clients
        }

    hashes = [chunk_hash(c) for c in chunks]
    ids = [_vector_id(source_id, h) for h in hashes]

    # Skip chunks already present in Pinecone (under this namespace).
    already = existing_ids(ids, namespace=namespace)
    new_pairs: list[tuple[int, str, str, str]] = []
    for idx, (chunk, h, vid) in enumerate(zip(chunks, hashes, ids)):
        if vid in already:
            continue
        new_pairs.append((idx, chunk, h, vid))

    if not new_pairs:
        return {
            "source": source_id,
            "total_chunks": total,
            "new_chunks": 0,
            "skipped_chunks": total,
            "upserted": 0,
            "chunks": total,
        }

    new_chunks = [p[1] for p in new_pairs]
    vectors = embed(new_chunks)
    items: list[dict[str, Any]] = []
    for (idx, chunk, h, vid), vec in zip(new_pairs, vectors):
        items.append(
            {
                "id": vid,
                "values": vec,
                "metadata": {
                    "source": source_id,
                    "chunk_idx": idx,
                    "text": chunk,
                    "hash": h,
                },
            }
        )
    upserted = upsert(items, namespace=namespace)
    return {
        "source": source_id,
        "total_chunks": total,
        "new_chunks": len(new_pairs),
        "skipped_chunks": total - len(new_pairs),
        "upserted": upserted,
        "chunks": total,
    }


def ingest_many(sources: Iterable[str | Path], namespace: str | None = None) -> list[dict]:
    return [ingest_source(s, namespace=namespace) for s in sources]
