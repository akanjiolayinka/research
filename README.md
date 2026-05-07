# RAG Chatbot

A full-stack Retrieval-Augmented Generation chatbot. Ingest PDFs, Markdown, text files, or web URLs; ask questions and get streamed answers grounded in the source documents with citations.

## Architecture

```
┌─────────────────────┐     SSE stream     ┌──────────────────────┐
│ React + Vite + TS   │ ─────────────────► │ FastAPI backend      │
│ Tailwind chat UI    │ ◄───────────────── │ /chat/stream /ingest │
└─────────────────────┘                    └────────┬─────────────┘
                                                    │
                          ┌─────────────────────────┼──────────────────────┐
                          ▼                         ▼                      ▼
                   sentence-transformers      Pinecone (cosine)      Groq Llama 3.3
                   (local, all-MiniLM-L6)     vector index          (streaming)
```

- **Backend:** Python 3.11, FastAPI, Uvicorn
- **LLM:** [Groq](https://console.groq.com) free tier (`llama-3.3-70b-versatile`)
- **Embeddings:** local `sentence-transformers/all-MiniLM-L6-v2` (no API key)
- **Vector store:** Pinecone serverless free tier
- **Frontend:** React + Vite + TypeScript + Tailwind CSS, with markdown rendering and streamed token UI

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env
# fill in GROQ_API_KEY and PINECONE_API_KEY
```

Ingest a document:

```bash
python scripts/ingest_cli.py data/your_file.pdf
python scripts/ingest_cli.py https://example.com/article
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/health`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173.

### 3. Use it

1. Upload a PDF or paste a URL in the left panel.
2. Ask a question in the chat box.
3. Tokens stream in; cited source filenames appear under the answer.

## API

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/health` | — | Liveness check |
| POST | `/ingest/file` | multipart `file` | Ingest a PDF / MD / TXT |
| POST | `/ingest/url` | `{ "url": "..." }` | Ingest a web page |
| POST | `/chat/stream` | `{ "message": "...", "top_k"?: 5 }` | Server-sent events: `sources`, `token`, `done`, `error` |

## Tests

```bash
cd backend
pytest
```

Tests mock Groq and Pinecone — no network needed.

## Deploy

- **Frontend:** Vercel / Netlify. Set `VITE_API_URL` to your deployed backend.
- **Backend:** Render / Railway / Fly. Set env vars from `.env.example`. Add the deployed frontend origin to `CORS_ORIGINS`.

## Project layout

```
backend/
  app/{config,embeddings,vectorstore,ingest,llm,rag,main}.py
  scripts/ingest_cli.py
  tests/test_rag.py
frontend/
  src/{App.tsx,main.tsx,index.css}
  src/components/{ChatWindow,MessageBubble,SourceList,ComposerInput,IngestPanel}.tsx
  src/lib/api.ts
```

## License

MIT
