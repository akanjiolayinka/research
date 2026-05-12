# RAG Studio

A retrieval-augmented chatbot built around a real RAG pipeline — query rewriting,
hybrid retrieve-then-rerank, a hallucination guardrail, conversation memory, dedup
on ingest, and a Ragas evaluation harness.

## Pipeline

```
            ┌────────────────────────────────────────────────────────────────┐
            │                       /chat/stream                              │
            │                                                                 │
 user msg ─►│ memory[session] ─► rewrite (LLM) ─► embed ─► retrieve (Pinecone)│
            │                                                       │        │
            │                                                       ▼        │
            │                                              cross-encoder rerank│
            │                                                       │        │
            │                                                       ▼        │
            │                                  guardrail: max(rerank) ≥ τ ?  │
            │                                          │                      │
            │                            no ◄──────────┴──────────► yes      │
            │                            │                          │        │
            │                            ▼                          ▼        │
            │             "no relevant context"           Llama 3.3 70B (Groq)│
            │                            │                          │        │
            └────────────────────────────┴──────────────┬───────────┴────────┘
                                                        ▼
                                            SSE: session, rewrite,
                                            sources(+chunks+rerank),
                                            tokens, done
```

## Stack

- **Backend:** Python 3.11, FastAPI, Uvicorn
- **LLM:** [Groq](https://console.groq.com) free tier (`llama-3.3-70b-versatile`)
- **Embeddings:** local `sentence-transformers/all-MiniLM-L6-v2` (no key)
- **Reranker:** local `cross-encoder/ms-marco-MiniLM-L-6-v2` (no key)
- **Vector store:** Pinecone serverless free tier
- **Frontend:** React 18 + Vite + TypeScript + Tailwind + Framer Motion + Recharts
- **Evaluation:** Ragas (faithfulness, answer relevancy, context recall)

## What the pipeline actually does

1. **Conversation memory.** Each chat session gets a UUID; the last
   `CONVERSATION_WINDOW` (default 6) user/assistant turns live in an in-memory
   buffer keyed by session id. Resets on server restart.
2. **Query rewrite.** If the new message looks like a follow-up — short, or
   contains pronouns like *it / that / those / the second one* — it's
   rewritten via Groq into a self-contained, retrieval-optimized question
   using the last two turns. The original question is what the model
   eventually answers.
3. **Embed + retrieve.** The rewritten query is embedded locally and the top
   `TOP_K` (default 10) most similar chunks are pulled from Pinecone.
4. **Rerank.** A cross-encoder re-scores each `(query, chunk)` pair and the
   top `TOP_K_RERANK` (default 3) chunks survive. The `sources` SSE event
   carries both the vector similarity (`score`) and the rerank score
   (`rerank_score`).
5. **Hallucination guardrail.** If the best post-rerank score is below
   `MIN_RERANK_SCORE` (default 0.1) the LLM is **not called** — the user gets
   a single deterministic "I couldn't find relevant information…" instead.
6. **Generate + stream.** The conversation history + retrieved context + the
   user's original question are sent to Groq and the answer streams back to
   the frontend over Server-Sent Events.
7. **Ingest dedup.** Each chunk is SHA-256 hashed; deterministic vector ids
   let us skip chunks already present in Pinecone. The ingest response
   reports `{total_chunks, new_chunks, skipped_chunks}` and the frontend
   toast shows it.
8. **Sentence-aware chunking.** Text is split first on paragraph breaks
   (hard splits), then packed sentence-by-sentence under `CHUNK_SIZE` (a soft
   ceiling in characters). Sentences are never broken.

## Quick start

You need two free accounts (no card required):
- A Groq API key — https://console.groq.com → API Keys
- A Pinecone API key — https://app.pinecone.io → API Keys

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env       # paste GROQ_API_KEY + PINECONE_API_KEY

uvicorn app.main:app --reload --port 8000
```

On startup, the backend:
- validates required env vars (logs a friendly error and stays up — `/health` reports the same),
- warms the embedding and reranker models (each is ~80–90MB the first time, then cached),
- creates the Pinecone index if it doesn't exist.

```bash
curl http://localhost:8000/health
# -> {"status":"ok","missing_env":[],"model":"llama-3.3-70b-versatile",...}
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Use it

In the UI:
- **Knowledge Base** — drop a PDF/MD/TXT or paste a URL.
- **Chat** — ask a question. Tokens stream; citations appear under each answer; the Context Inspector on the right shows each retrieved chunk with both its `sim` (vector cosine) and `rr` (rerank) score.

CLI ingest:
```bash
cd backend
python scripts/ingest_cli.py data/sample.pdf
python scripts/ingest_cli.py https://example.com/article
```

## Evaluation

Ragas-based metrics — faithfulness, answer relevancy, context recall — over a small
local test set.

```bash
cd backend
pip install -e ".[eval]"          # extras: ragas, datasets, langchain-groq, langchain-huggingface
python scripts/eval_rag.py        # uses data/eval_set.json by default
```

Output: a per-question table to stdout and a JSON dump at `backend/data/eval_results.json`.
The bundled `data/eval_set.json` has 5 generic placeholder questions —
replace them with your own.

The judge LLM is your configured Groq model; the judge embeddings are the
same local model used for retrieval. **No new API keys are required.**

You can also run the eval interactively from the **Analytics** view in the UI:
the *Eval scores* card reads `data/eval_results.json` and shows the metrics as a
bar chart. If the file doesn't exist yet, click *Run evaluation* — the frontend
streams live logs from the subprocess via SSE and renders the chart when the run
completes (`POST /eval/run`, `GET /eval/results`).

## Pipeline trace (debug panel)

Every assistant message that involves retrieval gets a small bug-icon button in
its hover toolbar. Clicking it expands an inline debug panel showing:

- the **original** question,
- the **rewritten** standalone query (when the rewrite step fired),
- each retrieved chunk with both its vector similarity (`sim`) and cross-encoder
  rerank score (`rr`),
- whether the **guardrail** fired (when no chunk cleared `MIN_RERANK_SCORE`,
  the panel shows *"No relevant context found — LLM was not called"* instead of
  scores).

The default chat UI stays clean — the pipeline trace is opt-in per message.

## Configuration

All values live in `backend/.env` (see `backend/.env.example` for full comments):

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | ✓ | — | LLM provider |
| `PINECONE_API_KEY` | ✓ | — | Vector store |
| `GROQ_MODEL` | | `llama-3.3-70b-versatile` | Any chat model on Groq |
| `EMBED_MODEL` | | `sentence-transformers/all-MiniLM-L6-v2` | Local; if you change this, also update `embed_dim` in `app/config.py` |
| `RERANK_MODEL` | | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Local cross-encoder |
| `PINECONE_INDEX` | | `rag-chatbot` | Auto-created |
| `PINECONE_CLOUD` | | `aws` | `aws` / `gcp` |
| `PINECONE_REGION` | | `us-east-1` | Match your project |
| `CHUNK_SIZE` | | `800` | Soft ceiling per chunk (characters) |
| `CHUNK_OVERLAP` | | `120` | Trailing-sentence carry, characters |
| `TOP_K` | | `10` | Pinecone returns this many before reranking |
| `TOP_K_RERANK` | | `3` | Survivors after the cross-encoder |
| `MIN_RERANK_SCORE` | | `0.1` | Below this → guardrail blocks the LLM call |
| `CONVERSATION_WINDOW` | | `6` | Recent turns kept in the per-session buffer |
| `CORS_ORIGINS` | | localhost:5173 | Comma-separated |

Frontend (`frontend/.env`):

| Variable | Required | Default |
|---|---|---|
| `VITE_API_URL` | | `http://localhost:8000` |

## API

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/health` | — | Status + active model + retrieval/guardrail config |
| POST | `/ingest/file?namespace=…` | multipart `file` | Returns `{source, total_chunks, new_chunks, skipped_chunks, upserted}` |
| POST | `/ingest/url` | `{url, namespace?}` | Same shape as `/ingest/file` |
| POST | `/chat/stream` | `{message, session_id?, top_k?, namespace?}` | SSE: `session`, `rewrite?`, `sources`, `token…`, `done` |
| GET | `/eval/results` | — | Returns the latest Ragas results JSON, or 404 if none yet |
| POST | `/eval/run` | — | Runs `scripts/eval_rag.py` as a subprocess; SSE stream of `log` events then a final `done` with parsed results |

The `sources` event includes a `chunks` array with full per-chunk metadata:
```json
{
  "type": "sources",
  "sources": ["report.pdf"],
  "chunks": [
    {
      "source": "report.pdf",
      "chunk_idx": 3,
      "score": 0.82,
      "rerank_score": 5.41,
      "text": "…"
    }
  ]
}
```

If guardrail blocks the call, the `done` event includes `"guardrail":"no_relevant_context"`.

## Tests

```bash
cd backend
pytest
```

The unit tests cover: sentence-aware chunking, deduplication on ingest, the
follow-up heuristic + LLM rewrite (with mocked LLM), reranker sort order, the
guardrail (blocks when no chunk clears the threshold and when retrieval returns
nothing), full pipeline event order, and the conversation memory window.

## Deploy

- **Frontend:** Vercel / Netlify. Set `VITE_API_URL` to your deployed backend.
- **Backend:** Render / Railway / Fly. Set env vars from `backend/.env.example`. Add the deployed frontend origin to `CORS_ORIGINS`.

## Project layout

```
backend/
  app/
    config.py        # pydantic-settings; reads .env
    embeddings.py    # local SentenceTransformer (lazy singleton)
    reranker.py      # local CrossEncoder (lazy singleton)
    vectorstore.py   # Pinecone client + existing_ids() for dedup
    ingest.py        # sentence-aware chunker + SHA-256 dedup
    memory.py        # in-memory per-session conversation buffer
    llm.py           # Groq SDK wrapper (chat_stream + chat_once)
    rag.py           # rewrite → retrieve → rerank → guardrail → generate
    main.py          # FastAPI app + lifespan warm-up + SSE endpoint
  scripts/
    ingest_cli.py
    eval_rag.py      # Ragas evaluation
  data/
    eval_set.json    # sample evaluation questions
  tests/
    test_rag.py
frontend/
  src/
    App.tsx
    components/{Layout,Chat,KnowledgeBase,Dashboard,Analytics,Settings,UI}/*.tsx
    lib/{api,errors,store}.ts
```

## License

MIT
