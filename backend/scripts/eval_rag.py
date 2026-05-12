"""Evaluate the full RAG pipeline with Ragas.

Usage:
    cd backend
    pip install -e ".[eval]"
    python scripts/eval_rag.py [path/to/eval_set.json]

Reads `data/eval_set.json` (or the path passed on the command line) — an
array of {question, ground_truth_answer, source_doc} objects — runs each
question through the full pipeline (memory → rewrite → retrieve → rerank →
guardrail → generate), and computes:

  • faithfulness     — is the answer grounded in retrieved chunks?
  • answer_relevancy — does the answer address the question?
  • context_recall   — were the right chunks retrieved?

Results are printed as a table and saved to `data/eval_results.json`.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from app import memory
from app.config import get_settings
from app.rag import answer_stream

DEFAULT_INPUT = Path(__file__).resolve().parent.parent / "data" / "eval_set.json"
RESULTS_FILE = Path(__file__).resolve().parent.parent / "data" / "eval_results.json"


def _run_pipeline(question: str) -> tuple[str, list[str]]:
    """Execute one full RAG turn and return (answer, retrieved_chunk_texts)."""
    answer_parts: list[str] = []
    chunk_texts: list[str] = []
    session = f"eval-{abs(hash(question))}"
    memory.clear(session)
    for event in answer_stream(question, session_id=session):
        if event.get("type") == "sources":
            chunk_texts = [c["text"] for c in event.get("chunks", [])]
        elif event.get("type") == "token":
            answer_parts.append(event["text"])
    memory.clear(session)
    return "".join(answer_parts), chunk_texts


def main(argv: list[str]) -> int:
    try:
        from datasets import Dataset
        from langchain_groq import ChatGroq
        from langchain_huggingface import HuggingFaceEmbeddings
        from ragas import evaluate
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from ragas.metrics import answer_relevancy, context_recall, faithfulness
    except ImportError as exc:
        print(
            "Eval dependencies are missing. Install them with:\n\n"
            "  pip install -e \".[eval]\"\n\n"
            f"Underlying error: {exc}"
        )
        return 1

    settings = get_settings()
    if not settings.groq_api_key or not settings.pinecone_api_key:
        print("Set GROQ_API_KEY and PINECONE_API_KEY in backend/.env first.")
        return 1

    input_path = Path(argv[0]) if argv else DEFAULT_INPUT
    if not input_path.exists():
        print(f"Eval set not found: {input_path}")
        return 1
    items = json.loads(input_path.read_text())

    print(f"Evaluating {len(items)} question(s) from {input_path} …\n")

    questions, answers, contexts, ground_truths = [], [], [], []
    for i, item in enumerate(items, 1):
        q = item["question"]
        print(f"  [{i}/{len(items)}] {q}")
        answer, chunks = _run_pipeline(q)
        questions.append(q)
        answers.append(answer)
        contexts.append(chunks or ["(no context retrieved)"])
        ground_truths.append(item["ground_truth_answer"])

    dataset = Dataset.from_dict(
        {
            "question": questions,
            "answer": answers,
            "contexts": contexts,
            "ground_truth": ground_truths,
        }
    )

    judge_llm = LangchainLLMWrapper(
        ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0.0)
    )
    judge_embeddings = LangchainEmbeddingsWrapper(
        HuggingFaceEmbeddings(model_name=settings.embed_model)
    )

    print("\nScoring with Ragas…")
    result = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_recall],
        llm=judge_llm,
        embeddings=judge_embeddings,
    )

    df = result.to_pandas()
    print("\n=== Per-question scores ===")
    print(df.to_string(index=False))
    print("\n=== Mean scores ===")
    means = {
        "faithfulness": float(df["faithfulness"].mean()),
        "answer_relevancy": float(df["answer_relevancy"].mean()),
        "context_recall": float(df["context_recall"].mean()),
    }
    for k, v in means.items():
        print(f"  {k:18s} {v:.3f}")

    RESULTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_FILE.write_text(
        json.dumps(
            {
                "summary": means,
                "rows": df.to_dict(orient="records"),
            },
            indent=2,
            default=str,
        )
    )
    print(f"\nSaved → {RESULTS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
