from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterable

import httpx
import trafilatura
from pypdf import PdfReader

from .config import get_settings
from .embeddings import embed
from .vectorstore import upsert

# Approximation: tokenize by treating ~4 characters as one token. This avoids
# a network download at startup (tiktoken fetches BPE tables on first use) and
# is plenty accurate for retrieval chunking.
CHARS_PER_TOKEN = 4


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n\n".join((page.extract_text() or "") for page in reader.pages)


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _read_url(url: str) -> str:
    resp = httpx.get(url, timeout=30, follow_redirects=True, headers={"User-Agent": "rag-chatbot/0.1"})
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


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    """Split text into overlapping windows. Sizes are in approximate tokens
    (1 token ≈ 4 characters) so the produced chunks land near the configured
    CHUNK_SIZE without needing an encoder download at startup."""
    settings = get_settings()
    chunk_size = chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap
    if not text:
        return []
    char_size = chunk_size * CHARS_PER_TOKEN
    char_overlap = overlap * CHARS_PER_TOKEN
    step = max(1, char_size - char_overlap)
    chunks: list[str] = []
    for start in range(0, len(text), step):
        window = text[start : start + char_size]
        if not window:
            break
        chunks.append(window)
        if start + char_size >= len(text):
            break
    return [c.strip() for c in chunks if c.strip()]


def _chunk_id(source_id: str, idx: int) -> str:
    digest = hashlib.sha1(f"{source_id}::{idx}".encode("utf-8")).hexdigest()
    return f"{source_id}-{digest[:16]}"


def ingest_source(source: str | Path, namespace: str | None = None) -> dict:
    source_id, text = load_source(source)
    chunks = chunk_text(text)
    if not chunks:
        return {"source": source_id, "chunks": 0, "upserted": 0}

    vectors = embed(chunks)
    items = []
    for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
        items.append(
            {
                "id": _chunk_id(source_id, idx),
                "values": vec,
                "metadata": {"source": source_id, "chunk_idx": idx, "text": chunk},
            }
        )
    upserted = upsert(items, namespace=namespace)
    return {"source": source_id, "chunks": len(chunks), "upserted": upserted}


def ingest_text(source_id: str, text: str, namespace: str | None = None) -> dict:
    chunks = chunk_text(text)
    if not chunks:
        return {"source": source_id, "chunks": 0, "upserted": 0}
    vectors = embed(chunks)
    items: list[dict] = []
    for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
        items.append(
            {
                "id": _chunk_id(source_id, idx),
                "values": vec,
                "metadata": {"source": source_id, "chunk_idx": idx, "text": chunk},
            }
        )
    upserted = upsert(items, namespace=namespace)
    return {"source": source_id, "chunks": len(chunks), "upserted": upserted}


def ingest_many(sources: Iterable[str | Path], namespace: str | None = None) -> list[dict]:
    return [ingest_source(s, namespace=namespace) for s in sources]
