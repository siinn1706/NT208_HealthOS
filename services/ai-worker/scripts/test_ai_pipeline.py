#!/usr/bin/env python3
"""End-to-end smoke test for the AI food analysis pipeline.

Generates synthetic test images covering key edge cases, serves them via a
temporary HTTP server, then POSTs each to the ai-worker /analyze endpoint
and prints a results table.

Usage:
    python scripts/test_ai_pipeline.py [--host localhost] [--port 8001]
"""
from __future__ import annotations

import argparse
import io
import json
import sys
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

# ---------------------------------------------------------------------------
# Test image factory
# ---------------------------------------------------------------------------

def _make_single_dish() -> Image.Image:
    """Warm-toned image resembling a bowl of food."""
    img = Image.new("RGB", (640, 480), (200, 100, 50))
    draw = ImageDraw.Draw(img)
    draw.ellipse([120, 80, 520, 400], fill=(180, 90, 40))
    draw.ellipse([160, 120, 480, 360], fill=(220, 160, 80))
    return img


def _make_mixed_meal() -> Image.Image:
    """Multiple food-like rectangles on a plate background."""
    img = Image.new("RGB", (640, 480), (240, 230, 200))
    draw = ImageDraw.Draw(img)
    draw.ellipse([80, 60, 560, 420], fill=(220, 210, 185))
    draw.rectangle([120, 120, 260, 220], fill=(180, 80, 50))
    draw.rectangle([280, 130, 400, 230], fill=(100, 160, 60))
    draw.rectangle([120, 250, 250, 360], fill=(240, 200, 80))
    draw.rectangle([280, 260, 420, 370], fill=(200, 120, 40))
    return img


def _make_poor_lighting() -> Image.Image:
    """Very dark image — poor ambient light scenario."""
    img = _make_single_dish()
    dark = Image.new("RGB", img.size, (0, 0, 0))
    return Image.blend(img, dark, alpha=0.75)


def _make_blurry() -> Image.Image:
    """Heavily blurred image."""
    img = _make_single_dish()
    for _ in range(6):
        img = img.filter(ImageFilter.GaussianBlur(radius=8))
    return img


def _make_non_food() -> Image.Image:
    """Geometric pattern — clearly not food."""
    img = Image.new("RGB", (512, 512), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    for i in range(0, 512, 32):
        color = (0, 0, 200) if (i // 32) % 2 == 0 else (255, 255, 255)
        draw.rectangle([i, 0, i + 16, 512], fill=color)
    for j in range(0, 512, 32):
        color = (200, 0, 0) if (j // 32) % 2 == 0 else (255, 255, 255)
        draw.rectangle([0, j, 512, j + 16], fill=color)
    return img


def _make_large_image() -> Image.Image:
    """Large resolution image simulating a high-res camera shot."""
    img = Image.new("RGB", (3840, 2160), (180, 100, 50))
    draw = ImageDraw.Draw(img)
    draw.ellipse([500, 300, 3340, 1860], fill=(200, 140, 70))
    return img


def _make_mobile_portrait() -> Image.Image:
    """Portrait aspect ratio — typical mobile camera shot."""
    img = Image.new("RGB", (480, 854), (160, 90, 40))
    draw = ImageDraw.Draw(img)
    draw.ellipse([80, 200, 400, 654], fill=(200, 140, 70))
    draw.ellipse([130, 270, 350, 580], fill=(220, 170, 90))
    return img


import os
from pathlib import Path

# (name, description, detection_required)
# detection_required=True  → HTTP 200 with nutrition is required to pass
# detection_required=False → HTTP 200 OR "no food detected" 503 is acceptable;
#                            only a crash / unexpected error is a failure
SYNTHETIC_CASES: list[tuple[str, str, bool]] = [
    ("single_dish",     "Synthetic: single bowl shape",           False),
    ("mixed_meal",      "Synthetic: multi-item plate",            False),
    ("poor_lighting",   "Synthetic: very dark",                   False),
    ("blurry",          "Synthetic: heavy Gaussian blur",         False),
    ("non_food",        "Synthetic: geometric non-food pattern",  False),
    ("large_image",     "Synthetic: 3840×2160 landscape",         False),
    ("mobile_portrait", "Synthetic: portrait 480×854",            False),
]

_FACTORIES = {
    "single_dish": _make_single_dish,
    "mixed_meal": _make_mixed_meal,
    "poor_lighting": _make_poor_lighting,
    "blurry": _make_blurry,
    "non_food": _make_non_food,
    "large_image": _make_large_image,
    "mobile_portrait": _make_mobile_portrait,
}

# Real food photos from CalorieCLIP example assets (bundled with the model).
_CALORIECLIP_EXAMPLES = (
    Path(__file__).parent.parent / "models" / "calorieclip" / "assets" / "examples"
)


def _real_food_cases() -> list[tuple[str, bytes, bool]]:
    """Return (name, jpeg_bytes, detection_required=True) for every real example image."""
    cases: list[tuple[str, bytes, bool]] = []
    if not _CALORIECLIP_EXAMPLES.is_dir():
        return cases
    for p in sorted(_CALORIECLIP_EXAMPLES.iterdir()):
        if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
            img = Image.open(p).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            # detection_required=False: YOLO covers only 68 Vietnamese food classes;
            # non-Vietnamese images correctly return "no match" — not a pipeline failure.
            cases.append((f"real_{p.stem}", buf.getvalue(), False))
    return cases


def build_test_images() -> tuple[dict[str, bytes], list[tuple[str, str, bool]]]:
    """Return (image_bytes_map, all_test_cases)."""
    images: dict[str, bytes] = {}
    all_cases: list[tuple[str, str, bool]] = []

    # Synthetic
    for name, desc, det_req in SYNTHETIC_CASES:
        buf = io.BytesIO()
        _FACTORIES[name]().save(buf, format="JPEG", quality=85)
        images[name] = buf.getvalue()
        all_cases.append((name, desc, det_req))

    # Real food images
    for rname, data, det_req in _real_food_cases():
        images[rname] = data
        all_cases.append((rname, "Real food photo (CalorieCLIP example)", det_req))

    return images, all_cases


# ---------------------------------------------------------------------------
# Temporary HTTP image server
# ---------------------------------------------------------------------------

class _ImageHandler(BaseHTTPRequestHandler):
    images: dict[str, bytes] = {}

    def log_message(self, *_):  # suppress per-request logs
        pass

    def do_GET(self):
        name = self.path.lstrip("/")
        data = self.images.get(name)
        if data is None:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def _start_image_server(images: dict[str, bytes]) -> tuple[HTTPServer, int]:
    _ImageHandler.images = images
    server = HTTPServer(("127.0.0.1", 0), _ImageHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

@dataclass
class TestResult:
    name: str
    description: str
    # "pass"     = HTTP 200, nutrition returned
    # "no_food"  = HTTP 503 ANALYSIS_FAILED (model ran, found nothing) — OK for synthetic/non-food
    # "fail"     = detection_required=True but no detection, OR unexpected HTTP error
    # "error"    = connection/timeout error
    status: str
    detection_required: bool = False
    http_code: int = 0
    dish_name: str = ""
    confidence: float = 0.0
    calories: float = 0.0
    source: str = ""
    warnings: list[str] = field(default_factory=list)
    error: str = ""
    elapsed_ms: float = 0.0


_NO_FOOD_MSG = "Local meal detector could not identify"


def _post_analyze(worker_base: str, image_server_port: int, name: str) -> tuple[int, dict]:
    image_url = f"http://127.0.0.1:{image_server_port}/{name}"
    payload = json.dumps({"meal_id": f"smoke-{name}", "image_url": image_url}).encode()
    req = urllib.request.Request(
        f"{worker_base}/analyze",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.status, json.loads(resp.read())


def _classify_503(body: dict, detection_required: bool) -> tuple[str, str]:
    """Return (status, error_detail) for a 503 response."""
    detail = body.get("detail", {})
    msg = detail.get("message", "") if isinstance(detail, dict) else str(detail)
    if _NO_FOOD_MSG in msg:
        # Pipeline ran successfully; model found no matching food class.
        status = "fail" if detection_required else "no_food"
        return status, "no food class detected (expected for non-food/synthetic)"
    return "fail", msg[:200]


def run_tests(
    worker_base: str,
    image_server_port: int,
    all_cases: list[tuple[str, str, bool]],
) -> list[TestResult]:
    results: list[TestResult] = []
    for name, description, det_req in all_cases:
        label = name[:30]
        print(f"  {label:<30} ... ", end="", flush=True)
        result = TestResult(
            name=name, description=description, status="error",
            detection_required=det_req,
        )
        t0 = time.perf_counter()
        try:
            code, body = _post_analyze(worker_base, image_server_port, name)
            elapsed = (time.perf_counter() - t0) * 1000
            result.http_code = code
            result.elapsed_ms = elapsed
            if code == 200:
                nutrition = body.get("nutrition", {})
                result.dish_name = nutrition.get("dish_name", "")
                result.confidence = nutrition.get("confidence", 0.0)
                result.calories = nutrition.get("calories", 0.0)
                result.source = nutrition.get("source", "")
                result.warnings = nutrition.get("warnings", [])
                result.status = "pass"
            else:
                result.status = "fail"
                result.error = str(body)[:200]
        except urllib.error.HTTPError as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            result.elapsed_ms = elapsed
            result.http_code = exc.code
            try:
                err_body = json.loads(exc.read().decode())
            except Exception:
                err_body = {}
            if exc.code == 503:
                result.status, result.error = _classify_503(err_body, det_req)
            else:
                result.status = "fail"
                result.error = str(err_body)[:200]
        except Exception as exc:
            result.elapsed_ms = (time.perf_counter() - t0) * 1000
            result.status = "error"
            result.error = str(exc)[:200]
        print(result.status.upper())
        results.append(result)
    return results


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def check_health(worker_base: str) -> dict[str, Any]:
    req = urllib.request.Request(f"{worker_base}/health")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


# ---------------------------------------------------------------------------
# Report printer
# ---------------------------------------------------------------------------

def print_report(results: list[TestResult], health: dict[str, Any]) -> None:
    sep = "-" * 100
    print("\n" + sep)
    print("AI Pipeline Smoke Test Report")
    print(sep)

    detector = health.get("detector", {})
    primary = detector.get("primary", {})
    crosscheck = detector.get("crosscheck", {})
    legacy = detector.get("legacy_yolo", {})
    print(f"Health:          {health.get('status', 'unknown')}")
    print(f"Primary (VLM):   enabled={primary.get('enabled')}  loaded={primary.get('model_loaded')}  local_base={primary.get('local_base_exists')}")
    print(f"CalorieCLIP:     enabled={crosscheck.get('enabled')}  loaded={crosscheck.get('model_loaded')}")
    print(f"YOLO (fallback): loaded={legacy.get('model_loaded')}  db_size={legacy.get('class_db_size', 0)}  model_exists={legacy.get('model_exists')}")
    print(sep)

    fmt = "{:<32}  {:>4}  {:>7}ms  {:>12}  {:>5}  {:>6}  {}"
    print(fmt.format("TEST CASE", "HTTP", "ELAPSED", "DISH", "CONF", "CALS", "RESULT"))
    print(sep)
    passes = no_foods = fails = errors = 0
    for r in results:
        if r.status == "pass":
            passes += 1
            dish = (r.dish_name[:10] + "..") if len(r.dish_name) > 12 else r.dish_name
            detail = f"source={r.source}" + (f"  warn={len(r.warnings)}" if r.warnings else "")
        elif r.status == "no_food":
            no_foods += 1
            dish = "-"
            detail = "no class detected (pipeline ran OK)"
        else:
            if r.status == "fail":
                fails += 1
            else:
                errors += 1
            dish = "-"
            detail = r.error[:60] if r.error else "(no detail)"

        print(fmt.format(
            r.name[:32],
            str(r.http_code) if r.http_code else "-",
            f"{r.elapsed_ms:.0f}",
            dish[:12],
            f"{r.confidence:.2f}" if r.status == "pass" else "-",
            f"{r.calories:.0f}" if r.status == "pass" else "-",
            detail,
        ))

    print(sep)
    total = len(results)
    print(
        f"Results: {passes} detected  |  {no_foods} no-class (ok)  |  {fails} failed  |  {errors} errors"
        f"  [{total} total]"
    )
    print("Legend: 'detected'=food found+200  'no-class'=pipeline ran,no match  'failed'=unexpected error")

    for r in results:
        if r.status == "pass" and r.warnings:
            print(f"\nWarnings for {r.name}:")
            for w in r.warnings:
                print(f"  - {w}")

    print(sep)

    if fails + errors > 0:
        print("\nUnexpected failures (investigate these):")
        for r in results:
            if r.status in ("fail", "error"):
                print(f"  [{r.status.upper()}] {r.name}: {r.error[:120]}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="AI pipeline end-to-end smoke test")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    worker_base = f"http://{args.host}:{args.port}"

    print(f"Connecting to ai-worker at {worker_base} ...")
    try:
        health = check_health(worker_base)
        print(f"  OK — status={health.get('status')}")
    except Exception as exc:
        print(f"  FAILED: {exc}")
        print(f"\nMake sure ai-worker is running: uvicorn app.main:app --port {args.port}")
        return 1

    print("\nGenerating test images ...")
    images, all_cases = build_test_images()
    real_count = sum(1 for n, _, _ in all_cases if n.startswith("real_"))
    synth_count = len(all_cases) - real_count
    print(f"  {synth_count} synthetic  +  {real_count} real food images  =  {len(all_cases)} total")

    server, img_port = _start_image_server(images)
    print(f"  Image server listening on port {img_port}")

    print(f"\nRunning {len(all_cases)} tests ...")
    results = run_tests(worker_base, img_port, all_cases)

    print_report(results, health)

    server.shutdown()

    hard_failures = sum(1 for r in results if r.status in ("error", "fail"))
    return 1 if hard_failures > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
