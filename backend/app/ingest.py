from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterable

import httpx
import tiktoken
import trafilatura
from pypdf import PdfReader

from .config import get_settings
from .embeddings import embed
from .vectorstore import upsert

_ENCODER = tiktoken.get_encoding("cl100k_base")


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
    settings = get_settings()
    chunk_size = chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap
    tokens = _ENCODER.encode(text)
    if not tokens:
        return []
    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(tokens), step):
        window = tokens[start : start + chunk_size]
        if not window:
            break
        chunks.append(_ENCODER.decode(window))
        if start + chunk_size >= len(tokens):
            break
    return [c.strip() for c in chunks if c.strip()]


def _chunk_id(source_id: str, idx: int) -> str:
    digest = hashlib.sha1(f"{source_id}::{idx}".encode("utf-8")).hexdigest()
    return f"{source_id}-{digest[:16]}"


def ingest_source(source: str | Path) -> dict:
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
    upserted = upsert(items)
    return {"source": source_id, "chunks": len(chunks), "upserted": upserted}


def ingest_text(source_id: str, text: str) -> dict:
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
    upserted = upsert(items)
    return {"source": source_id, "chunks": len(chunks), "upserted": upserted}


def ingest_many(sources: Iterable[str | Path]) -> list[dict]:
    return [ingest_source(s) for s in sources]
