from __future__ import annotations

import asyncio
import json
import logging
import sys
import tempfile
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import get_settings
from .ingest import ingest_source
from .rag import answer_stream

BACKEND_DIR = Path(__file__).resolve().parent.parent
EVAL_RESULTS_PATH = BACKEND_DIR / "data" / "eval_results.json"
EVAL_SCRIPT_PATH = BACKEND_DIR / "scripts" / "eval_rag.py"

logger = logging.getLogger("rag")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def _check_env() -> list[str]:
    settings = get_settings()
    missing: list[str] = []
    if not settings.groq_api_key:
        missing.append("GROQ_API_KEY")
    if not settings.pinecone_api_key:
        missing.append("PINECONE_API_KEY")
    return missing


@asynccontextmanager
async def lifespan(_app: FastAPI):
    missing = _check_env()
    if missing:
        msg = (
            "\n\n  Missing required environment variables: "
            + ", ".join(missing)
            + "\n  Copy backend/.env.example to backend/.env and fill in the keys.\n"
        )
        logger.error(msg)
    else:
        try:
            from . import embeddings, reranker, vectorstore

            settings = get_settings()
            logger.info("Loading embedding model %s …", settings.embed_model)
            embeddings._model()  # noqa: SLF001
            logger.info("Loading reranker model %s …", settings.rerank_model)
            reranker._model()  # noqa: SLF001
            logger.info("Initializing Pinecone index %s …", settings.pinecone_index)
            vectorstore.get_index()
            logger.info("Backend ready.")
        except Exception as exc:  # pragma: no cover
            logger.exception("Startup warm-up failed: %s", exc)
    yield


app = FastAPI(title="RAG Studio API", version="0.3.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    top_k: int | None = None
    namespace: str | None = None


class IngestUrlRequest(BaseModel):
    url: str
    namespace: str | None = None


@app.get("/health")
def health() -> dict:
    missing = _check_env()
    return {
        "status": "ok" if not missing else "degraded",
        "missing_env": missing,
        "model": settings.groq_model,
        "embed_model": settings.embed_model,
        "rerank_model": settings.rerank_model,
        "pinecone_index": settings.pinecone_index,
        "conversation_window": settings.conversation_window,
        "top_k": settings.top_k,
        "top_k_rerank": settings.top_k_rerank,
        "min_rerank_score": settings.min_rerank_score,
    }


@app.post("/ingest/url")
def ingest_url(payload: IngestUrlRequest) -> dict:
    try:
        return ingest_source(payload.url, namespace=payload.namespace)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/ingest/file")
async def ingest_file(
    file: UploadFile = File(...),
    namespace: str | None = None,
) -> dict:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".md", ".markdown", ".txt", ".rst"}:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)
    try:
        result = ingest_source(tmp_path, namespace=namespace)
        result["source"] = file.filename or result["source"]
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/chat/stream")
def chat_stream_endpoint(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    missing = _check_env()
    if missing:
        raise HTTPException(
            status_code=503,
            detail=(
                "Backend is missing required environment variables: "
                + ", ".join(missing)
                + ". See backend/.env.example."
            ),
        )

    session_id = req.session_id or uuid.uuid4().hex

    def event_source():
        # Emit the (possibly server-generated) session id first so the client
        # can persist it for subsequent turns.
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"
        try:
            for event in answer_stream(
                req.message,
                session_id=session_id,
                top_k=req.top_k,
                namespace=req.namespace,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception("chat_stream failed: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


@app.get("/eval/results")
def eval_results():
    """Return the most recent Ragas eval results, or 404 if none exist."""
    if not EVAL_RESULTS_PATH.exists():
        raise HTTPException(status_code=404, detail="No eval results yet")
    try:
        return json.loads(EVAL_RESULTS_PATH.read_text())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read results: {exc}") from exc


@app.post("/eval/run")
def eval_run():
    """Run scripts/eval_rag.py as a subprocess; stream stdout as SSE log
    events, then emit a final event with the parsed results JSON."""
    if not EVAL_SCRIPT_PATH.exists():
        raise HTTPException(status_code=500, detail="Eval script missing")

    async def gen():
        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                str(EVAL_SCRIPT_PATH),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(BACKEND_DIR),
            )
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            return

        assert proc.stdout is not None
        while True:
            raw = await proc.stdout.readline()
            if not raw:
                break
            line = raw.decode(errors="replace").rstrip()
            if line:
                yield f"data: {json.dumps({'type': 'log', 'line': line})}\n\n"

        await proc.wait()
        results = None
        if EVAL_RESULTS_PATH.exists():
            try:
                results = json.loads(EVAL_RESULTS_PATH.read_text())
            except Exception:
                results = None
        yield (
            "data: "
            + json.dumps(
                {
                    "type": "done",
                    "exit_code": proc.returncode,
                    "results": results,
                }
            )
            + "\n\n"
        )

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload="--reload" in sys.argv)
