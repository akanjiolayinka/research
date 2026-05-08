from __future__ import annotations

from app import memory, rag
from app.ingest import (
    chunk_hash,
    chunk_text,
    split_sentences,
)


# --- chunker -----------------------------------------------------------------


def test_chunk_text_respects_sentence_boundaries():
    text = (
        "Sentence one is here. Sentence two follows. Sentence three is the last."
    )
    chunks = chunk_text(text, chunk_size=40, overlap=0)
    assert len(chunks) >= 2
    # Every chunk ends at sentence-ending punctuation.
    for c in chunks:
        assert c.rstrip().endswith((".", "!", "?"))


def test_chunk_text_preserves_paragraph_breaks_as_hard_splits():
    text = "First paragraph. With two sentences.\n\nSecond paragraph entirely."
    chunks = chunk_text(text, chunk_size=400, overlap=0)
    # No chunk straddles a paragraph (the hard split).
    assert any("First paragraph" in c and "Second paragraph" not in c for c in chunks)
    assert any("Second paragraph" in c and "First paragraph" not in c for c in chunks)


def test_chunk_text_does_not_split_long_sentence():
    long = "This is a very long single sentence that exceeds the chunk size ceiling but must remain whole."
    chunks = chunk_text(long, chunk_size=20, overlap=0)
    assert chunks == [long]


def test_split_sentences_basic():
    out = split_sentences("Hi there. How are you? I'm fine!")
    assert out == ["Hi there.", "How are you?", "I'm fine!"]


# --- chunk hashing / dedup ---------------------------------------------------


def test_chunk_hash_is_deterministic_and_text_sensitive():
    a = chunk_hash("hello")
    b = chunk_hash("hello")
    c = chunk_hash("hello!")
    assert a == b
    assert a != c
    assert len(a) == 64


def test_ingest_text_skips_already_indexed_chunks(monkeypatch):
    from app import ingest

    # Pretend Pinecone already has every id we'd produce.
    monkeypatch.setattr(ingest, "embed", lambda chunks: [[0.0] * 4 for _ in chunks])
    captured: list[tuple] = []

    def fake_existing(ids, namespace=None):
        return set(ids)  # all already indexed

    def fake_upsert(items, namespace=None):
        captured.append((items, namespace))
        return len(items)

    monkeypatch.setattr(ingest, "existing_ids", fake_existing)
    monkeypatch.setattr(ingest, "upsert", fake_upsert)

    result = ingest.ingest_text("doc.md", "First. Second sentence here.")
    assert result["total_chunks"] >= 1
    assert result["new_chunks"] == 0
    assert result["skipped_chunks"] == result["total_chunks"]
    assert captured == []  # nothing upserted


def test_ingest_text_only_upserts_new_chunks(monkeypatch):
    from app import ingest

    monkeypatch.setattr(ingest, "embed", lambda chunks: [[0.0] * 4 for _ in chunks])
    seen_ids: list[str] = []

    monkeypatch.setattr(
        ingest, "existing_ids", lambda ids, namespace=None: set([ids[0]])
    )

    def fake_upsert(items, namespace=None):
        for it in items:
            seen_ids.append(it["id"])
        return len(items)

    monkeypatch.setattr(ingest, "upsert", fake_upsert)
    text = "Sentence one. Sentence two is different.\n\nThird paragraph here."
    result = ingest.ingest_text("doc.md", text)
    assert result["total_chunks"] >= 2
    assert result["skipped_chunks"] == 1
    assert result["new_chunks"] == result["total_chunks"] - 1
    assert len(seen_ids) == result["new_chunks"]


# --- query rewrite ----------------------------------------------------------


def test_is_followup_short_message():
    assert rag.is_followup("explain")
    assert rag.is_followup("tell me more")


def test_is_followup_pronouns():
    assert rag.is_followup("Why did they choose that approach over the alternatives?")
    assert rag.is_followup("Can you elaborate on the second point you made?")


def test_is_followup_standalone_question_is_not_followup():
    assert not rag.is_followup(
        "How do transformer models handle long-range dependencies in practice?"
    )


def test_rewrite_query_passes_through_when_no_history(monkeypatch):
    monkeypatch.setattr(rag, "chat_once", lambda *a, **k: "should_not_be_called")
    out = rag.rewrite_query("Tell me more.", history=[])
    assert out == "Tell me more."


def test_rewrite_query_uses_llm_for_followup(monkeypatch):
    captured: list[list[dict]] = []

    def fake_chat(messages, **kw):
        captured.append(messages)
        return '"What are the long-range dependency mechanisms in transformers?"'

    monkeypatch.setattr(rag, "chat_once", fake_chat)
    history = [
        {"role": "user", "content": "How do transformers work?"},
        {"role": "assistant", "content": "They use self-attention layers..."},
    ]
    out = rag.rewrite_query("Tell me more about that.", history=history)
    assert out == "What are the long-range dependency mechanisms in transformers?"
    assert captured  # the LLM was invoked


def test_rewrite_query_falls_back_to_original_on_llm_error(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("groq down")

    monkeypatch.setattr(rag, "chat_once", boom)
    history = [
        {"role": "user", "content": "x"},
        {"role": "assistant", "content": "y"},
    ]
    out = rag.rewrite_query("Tell me more.", history=history)
    assert out == "Tell me more."


# --- guardrail + answer pipeline --------------------------------------------


def _stub_pipeline(monkeypatch, matches: list[dict], tokens: list[str]):
    monkeypatch.setattr(rag, "retrieve", lambda q, top_k=None, namespace=None: list(matches))
    monkeypatch.setattr(rag, "rerank_matches", lambda q, m: m)
    monkeypatch.setattr(rag, "chat_stream", lambda messages: iter(tokens))
    monkeypatch.setattr(rag, "chat_once", lambda *a, **k: "")


def test_answer_stream_emits_session_chunks_and_tokens(monkeypatch):
    matches = [
        {
            "score": 0.9,
            "rerank_score": 5.0,
            "metadata": {"source": "x.txt", "chunk_idx": 0, "text": "context body"},
        }
    ]
    _stub_pipeline(monkeypatch, matches, ["Hello", " world"])
    memory.reset()

    events = list(rag.answer_stream("What is x?", session_id="s1"))
    types = [e["type"] for e in events]
    assert "sources" in types
    sources_evt = next(e for e in events if e["type"] == "sources")
    assert sources_evt["sources"] == ["x.txt"]
    assert sources_evt["chunks"][0]["rerank_score"] == 5.0
    assert sources_evt["chunks"][0]["score"] == 0.9
    token_texts = [e["text"] for e in events if e["type"] == "token"]
    assert "".join(token_texts) == "Hello world"
    # history persisted
    hist = memory.get("s1")
    assert hist[0]["role"] == "user"
    assert hist[1]["role"] == "assistant"
    assert hist[1]["content"] == "Hello world"


def test_guardrail_blocks_when_no_chunk_clears_threshold(monkeypatch):
    matches = [
        {
            "score": 0.5,
            "rerank_score": -3.2,
            "metadata": {"source": "x.txt", "chunk_idx": 0, "text": "irrelevant"},
        }
    ]
    _stub_pipeline(monkeypatch, matches, ["should not appear"])
    memory.reset()

    events = list(rag.answer_stream("Out of scope question?", session_id="s2"))
    token_texts = [e["text"] for e in events if e["type"] == "token"]
    assert token_texts == [rag.NO_CONTEXT_MESSAGE]
    done = next(e for e in events if e["type"] == "done")
    assert done.get("guardrail") == "no_relevant_context"


def test_guardrail_blocks_when_no_matches(monkeypatch):
    _stub_pipeline(monkeypatch, [], [])
    memory.reset()
    events = list(rag.answer_stream("Anything?", session_id="s3"))
    token_texts = [e["text"] for e in events if e["type"] == "token"]
    assert token_texts == [rag.NO_CONTEXT_MESSAGE]


# --- reranker ---------------------------------------------------------------


def test_reranker_sorts_and_attaches_scores(monkeypatch):
    from app import reranker

    class FakeModel:
        def predict(self, pairs):
            # First pair scored low, second high.
            return [0.1, 9.0]

    monkeypatch.setattr(reranker, "_model", lambda: FakeModel())
    matches = [
        {"score": 0.5, "metadata": {"text": "noise"}},
        {"score": 0.4, "metadata": {"text": "the answer"}},
    ]
    out = reranker.rerank("query", matches)
    assert out[0]["rerank_score"] == 9.0
    assert out[1]["rerank_score"] == 0.1


# --- conversation memory ----------------------------------------------------


def test_memory_window_evicts_old_turns(monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "conversation_window", 4)
    memory.reset()
    for i in range(6):
        memory.append("s", "user", f"q{i}")
        memory.append("s", "assistant", f"a{i}")
    out = memory.get("s")
    # window=4 means at most 4 most recent entries kept
    assert len(out) <= 4
    assert out[-1]["content"] == "a5"
