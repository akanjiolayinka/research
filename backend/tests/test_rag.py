from __future__ import annotations

from app import rag
from app.ingest import chunk_text


def test_chunk_text_produces_overlapping_windows():
    text = "word " * 2000
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) > 1
    assert all(c.strip() for c in chunks)


def test_format_context_includes_sources():
    matches = [
        {"score": 0.9, "metadata": {"source": "a.pdf", "text": "alpha info"}},
        {"score": 0.8, "metadata": {"source": "b.md", "text": "beta info"}},
    ]
    formatted = rag._format_context(matches)
    assert "a.pdf" in formatted and "alpha info" in formatted
    assert "b.md" in formatted and "beta info" in formatted


def test_unique_sources_dedupes_in_order():
    matches = [
        {"metadata": {"source": "a.pdf"}},
        {"metadata": {"source": "b.md"}},
        {"metadata": {"source": "a.pdf"}},
    ]
    assert rag.unique_sources(matches) == ["a.pdf", "b.md"]


def test_answer_stream_emits_sources_then_tokens(monkeypatch):
    fake_matches = [
        {"score": 1.0, "metadata": {"source": "x.txt", "chunk_idx": 0, "text": "context"}}
    ]
    monkeypatch.setattr(rag, "retrieve", lambda q, top_k=None, namespace=None: fake_matches)
    monkeypatch.setattr(rag, "chat_stream", lambda messages: iter(["Hello", " world"]))

    events = list(rag.answer_stream("question?"))
    assert events[0]["type"] == "sources"
    assert events[0]["sources"] == ["x.txt"]
    assert events[0]["chunks"][0]["source"] == "x.txt"
    assert events[0]["chunks"][0]["chunk_idx"] == 0
    assert events[0]["chunks"][0]["score"] == 1.0
    assert events[0]["chunks"][0]["text"] == "context"
    token_texts = [e["text"] for e in events if e["type"] == "token"]
    assert token_texts == ["Hello", " world"]
    assert events[-1] == {"type": "done"}
