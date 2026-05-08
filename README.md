# RAG Studio

A full-stack Retrieval-Augmented Generation chatbot. FastAPI backend + React/TypeScript frontend. Ingests PDFs, Markdown, text, and web URLs into Pinecone, then answers questions with Groq-hosted Llama and streams citations back to the UI.

## Stack

- **Backend:** Python 3.11, FastAPI, Uvicorn
- **LLM:** [Groq](https://console.groq.com) free tier (`llama-3.3-70b-versatile`)
- **Embeddings:** local `sentence-transformers/all-MiniLM-L6-v2` (no API key, runs on CPU)
- **Vector store:** Pinecone serverless free tier
- **Frontend:** React 18 + Vite + TypeScript + Tailwind + Framer Motion + Recharts

## Quick start

You will need two free accounts (no card required):
- A Groq API key from https://console.groq.com → API Keys
- A Pinecone API key from https://app.pinecone.io → API Keys

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

cp .env.example .env
# open backend/.env and paste GROQ_API_KEY + PINECONE_API_KEY

uvicorn app.main:app --reload --port 8000
```

On startup the backend will:
1. Validate that required env vars are present (logs a friendly error + keeps running, surfaced via `/health`).
2. Warm the embedding model (downloads ~80MB the first time, then cached).
3. Create the Pinecone index if it doesn't exist.

Sanity check:
```bash
curl http://localhost:8000/health
# -> {"status":"ok","missing_env":[],"model":"llama-3.3-70b-versatile",...}
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. You can also `cp .env.example .env` if you need to point the frontend at a different backend URL via `VITE_API_URL`.

### 3. Use it

Either via the UI:
- **Knowledge Base** view → drop a PDF/MD/TXT or paste a URL.
- **Chat** view → ask a question. Tokens stream in; citations appear under each answer; the right-hand Context Inspector shows the exact chunks used.

Or via the CLI:
```bash
cd backend
python scripts/ingest_cli.py data/sample.pdf
python scripts/ingest_cli.py https://example.com/article
```

## Configuration reference

All values live in `backend/.env` (see `backend/.env.example` for documentation):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `GROQ_API_KEY` | yes | — | Free at console.groq.com |
| `PINECONE_API_KEY` | yes | — | Free at app.pinecone.io |
| `GROQ_MODEL` | no | `llama-3.3-70b-versatile` | Any chat model on Groq |
| `PINECONE_INDEX` | no | `rag-chatbot` | Auto-created if missing |
| `PINECONE_CLOUD` | no | `aws` | `aws` or `gcp` |
| `PINECONE_REGION` | no | `us-east-1` | Match your Pinecone project |
| `EMBED_MODEL` | no | `sentence-transformers/all-MiniLM-L6-v2` | If you change this, also bump `embed_dim` in `app/config.py` |
| `CHUNK_SIZE` | no | `800` | Approx tokens per chunk |
| `CHUNK_OVERLAP` | no | `120` | Approx tokens of overlap |
| `TOP_K` | no | `5` | Chunks retrieved per query |
| `CORS_ORIGINS` | no | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated |

Frontend (`frontend/.env`):

| Variable | Required | Default |
|---|---|---|
| `VITE_API_URL` | no | `http://localhost:8000` |

## API

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/health` | — | Returns `{status, missing_env, model, embed_model, pinecone_index}` |
| POST | `/ingest/file?namespace=…` | multipart `file` | PDF / MD / TXT / RST |
| POST | `/ingest/url` | `{url, namespace?}` | Fetches and ingests a web page |
| POST | `/chat/stream` | `{message, top_k?, namespace?}` | Server-sent events: `sources`, `token`, `done`, `error` |

The `sources` event includes both filenames and full chunk metadata:
```json
{"type":"sources","sources":["report.pdf"],"chunks":[{"source":"report.pdf","chunk_idx":3,"score":0.82,"text":"…"}]}
```

## Tests

```bash
cd backend
pytest
```

Tests mock Groq and Pinecone — no network needed.

## Deploy

- **Frontend:** Vercel / Netlify. Set `VITE_API_URL` to your deployed backend.
- **Backend:** Render / Railway / Fly. Set env vars from `backend/.env.example`. Add the deployed frontend origin to `CORS_ORIGINS`.

## Project layout

```
backend/
  app/{config,embeddings,vectorstore,ingest,llm,rag,main}.py
  scripts/ingest_cli.py
  tests/test_rag.py
frontend/
  src/{App,main}.tsx
  src/components/{Layout,Chat,KnowledgeBase,Dashboard,Analytics,Settings,UI}/*.tsx
  src/lib/{api,errors,store}.ts
```

## License

MIT
