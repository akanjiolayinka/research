"""CLI: ingest local files or URLs into the Pinecone index.

Usage:
    python scripts/ingest_cli.py path/to/file.pdf
    python scripts/ingest_cli.py https://example.com/article
    python scripts/ingest_cli.py data/  # ingest a directory recursively
"""
from __future__ import annotations

import sys
from pathlib import Path

from app.ingest import ingest_source

SUPPORTED_SUFFIXES = {".pdf", ".md", ".markdown", ".txt", ".rst"}


def iter_targets(arg: str):
    if arg.startswith(("http://", "https://")):
        yield arg
        return
    p = Path(arg)
    if p.is_dir():
        for sub in p.rglob("*"):
            if sub.is_file() and sub.suffix.lower() in SUPPORTED_SUFFIXES:
                yield sub
    else:
        yield p


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 1
    for arg in argv:
        for target in iter_targets(arg):
            print(f"Ingesting {target} ...", flush=True)
            try:
                result = ingest_source(target)
                print(f"  -> chunks={result['chunks']} upserted={result['upserted']}")
            except Exception as exc:
                print(f"  ! failed: {exc}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
