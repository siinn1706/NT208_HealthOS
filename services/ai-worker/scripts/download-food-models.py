"""Download local food-analysis and CalorieCLIP model snapshots."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from huggingface_hub import snapshot_download


SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FOOD_REPO = "Ateeqq/food-analysis"
DEFAULT_CALORIECLIP_REPO = "jc-builds/CalorieCLIP"


def download_snapshot(repo_id: str, target_dir: Path, revision: str | None) -> Path:
    target_dir.mkdir(parents=True, exist_ok=True)
    return Path(
        snapshot_download(
            repo_id=repo_id,
            revision=revision,
            local_dir=target_dir,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--food-repo",
        default=os.getenv("AI_FOOD_ANALYSIS_REPO_ID", DEFAULT_FOOD_REPO),
        help="Hugging Face repo id for the primary food-analysis model.",
    )
    parser.add_argument(
        "--calorieclip-repo",
        default=os.getenv("AI_CALORIECLIP_REPO_ID", DEFAULT_CALORIECLIP_REPO),
        help="Hugging Face repo id for the CalorieCLIP cross-check model.",
    )
    parser.add_argument(
        "--food-dir",
        type=Path,
        default=Path(os.getenv("AI_FOOD_ANALYSIS_MODEL_PATH", SERVICE_ROOT / "models" / "food-analysis")),
        help="Local directory for the food-analysis model snapshot.",
    )
    parser.add_argument(
        "--calorieclip-dir",
        type=Path,
        default=Path(os.getenv("AI_CALORIECLIP_MODEL_PATH", SERVICE_ROOT / "models" / "calorieclip")),
        help="Local directory for the CalorieCLIP model snapshot.",
    )
    parser.add_argument("--food-revision", default=os.getenv("AI_FOOD_ANALYSIS_REVISION"))
    parser.add_argument("--calorieclip-revision", default=os.getenv("AI_CALORIECLIP_REVISION"))
    parser.add_argument(
        "--with-food-base",
        action="store_true",
        help="Also download the food-analysis LoRA base model into food-analysis/base-model.",
    )
    parser.add_argument(
        "--skip-calorieclip",
        action="store_true",
        help="Download only the primary food-analysis model.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    food_dir = download_snapshot(args.food_repo, args.food_dir.expanduser(), args.food_revision)
    print(f"food-analysis: {food_dir}")
    if args.with_food_base:
        adapter_config = food_dir / "adapter_config.json"
        if not adapter_config.exists():
            print("food-analysis base: skipped (adapter_config.json not found)")
        else:
            base_repo = json.loads(adapter_config.read_text(encoding="utf-8")).get("base_model_name_or_path")
            if not isinstance(base_repo, str) or not base_repo.strip():
                raise RuntimeError("adapter_config.json missing base_model_name_or_path")
            base_dir = download_snapshot(base_repo, food_dir / "base-model", None)
            print(f"food-analysis base: {base_dir}")

    if not args.skip_calorieclip:
        calorieclip_dir = download_snapshot(
            args.calorieclip_repo,
            args.calorieclip_dir.expanduser(),
            args.calorieclip_revision,
        )
        print(f"calorieclip: {calorieclip_dir}")


if __name__ == "__main__":
    main()
