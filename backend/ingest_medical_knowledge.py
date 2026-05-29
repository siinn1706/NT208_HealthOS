from __future__ import annotations

import argparse
import asyncio
import json
from dataclasses import asdict
from pathlib import Path

from app.adapters.database import AsyncSessionLocal
from app.services.medical_rag_corpus import MANIFEST_PATH
from app.services.medical_rag_ingest import ingest_medical_knowledge


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Ingest the bundled medical RAG corpus.")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=MANIFEST_PATH,
        help="Path to a medical knowledge manifest JSON file.",
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Run ingest and then roll back instead of committing.",
    )
    return parser


async def _run(manifest_path: Path, rollback: bool) -> dict[str, object]:
    async with AsyncSessionLocal() as db:
        stats = await ingest_medical_knowledge(db, manifest_path=manifest_path)
        if rollback:
            await db.rollback()
        else:
            await db.commit()
        return {
            "manifest": str(manifest_path),
            "committed": not rollback,
            "stats": asdict(stats),
        }


def main() -> None:
    args = _build_parser().parse_args()
    manifest_path = args.manifest.expanduser().resolve()
    payload = asyncio.run(_run(manifest_path, args.rollback))
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
