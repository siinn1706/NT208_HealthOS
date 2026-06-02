"""Small local benchmark for meal detector paths."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

from PIL import Image

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.services.calorieclip_detector import estimate_with_calorieclip
from app.services.food_analysis_detector import detect_with_food_analysis
from app.services.food_detector_service import _detect_with_yolo


def iter_images(sample_dir: Path) -> list[Path]:
    if not sample_dir.exists():
        return []
    suffixes = {".jpg", ".jpeg", ".png", ".webp"}
    return sorted(path for path in sample_dir.iterdir() if path.suffix.lower() in suffixes)


def run_detector(label: str, fn: Any, image: Image.Image) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        result = fn(image)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        if result is None:
            return {"detector": label, "ok": False, "elapsed_ms": elapsed_ms, "error": "no result"}
        return {
            "detector": label,
            "ok": True,
            "elapsed_ms": elapsed_ms,
            "dish_name": getattr(result, "dish_name", None),
            "calories": getattr(result, "calories", None),
            "confidence": getattr(result, "confidence", None),
            "source": getattr(result, "source", label),
        }
    except Exception as exc:
        return {
            "detector": label,
            "ok": False,
            "elapsed_ms": round((time.perf_counter() - started) * 1000, 1),
            "error": f"{type(exc).__name__}: {exc}",
        }


def markdown_report(rows: list[dict[str, Any]], sample_dir: Path) -> str:
    lines = [
        "# Food Detector Benchmark",
        "",
        f"- Sample directory: `{sample_dir}`",
        f"- Images tested: {len({row['image'] for row in rows}) if rows else 0}",
        "",
    ]
    if not rows:
        lines.extend([
            "No sample images found. Add `.jpg`, `.jpeg`, `.png`, or `.webp` files and run again.",
            "",
        ])
        return "\n".join(lines)

    lines.extend([
        "| Image | Detector | OK | ms | Dish | Calories | Confidence | Notes |",
        "|---|---:|---:|---:|---|---:|---:|---|",
    ])
    for row in rows:
        notes = row.get("error") or row.get("source") or ""
        lines.append(
            "| {image} | {detector} | {ok} | {elapsed_ms} | {dish} | {cal} | {conf} | {notes} |".format(
                image=row["image"],
                detector=row["detector"],
                ok="yes" if row["ok"] else "no",
                elapsed_ms=row["elapsed_ms"],
                dish=row.get("dish_name") or "",
                cal=row.get("calories") or "",
                conf=row.get("confidence") or "",
                notes=str(notes).replace("|", "\\|"),
            )
        )
    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=Path, default=SERVICE_ROOT / "samples")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--json", action="store_true", help="Print JSON rows instead of markdown.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows: list[dict[str, Any]] = []
    for image_path in iter_images(args.samples):
        with Image.open(image_path) as image:
            rows.append({"image": image_path.name, **run_detector("Ateeqq/food-analysis", detect_with_food_analysis, image)})
            rows.append({"image": image_path.name, **run_detector("YOLO legacy", _detect_with_yolo, image)})
            rows.append({
                "image": image_path.name,
                **run_detector(
                    "jc-builds/CalorieCLIP",
                    lambda img: estimate_with_calorieclip(img, image_path.stem),
                    image,
                ),
            })

    output = json.dumps(rows, indent=2) if args.json else markdown_report(rows, args.samples)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
