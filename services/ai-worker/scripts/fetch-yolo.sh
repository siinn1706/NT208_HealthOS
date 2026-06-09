#!/usr/bin/env bash
# fetch-yolo.sh — standalone YOLO weights downloader used by the Dockerfile
# model-fetch stage.
#
# Usage:
#   fetch-yolo.sh <dest-path>
#
# Env (any one source is enough):
#   AI_YOLO_MIRROR_URL    Direct https URL to the .pt file (preferred for CI).
#                         Optional bearer token from BuildKit secret at
#                         /run/secrets/ai_yolo_mirror_token.
#   AI_YOLO_GDRIVE_FILE_ID  Public Google Drive file id. Used when no mirror.
#
# Always required:
#   AI_YOLO_MODEL_SHA256  Hex sha256 of the expected .pt file. Verified after
#                         download; on mismatch the temp file is deleted and the
#                         script fails. Skipping this is refused — building the
#                         prod image without integrity verification is unsafe.
set -euo pipefail

dest="${1:-}"
if [[ -z "$dest" ]]; then
  echo "[fetch-yolo] usage: $0 <dest-path>" >&2
  exit 2
fi

mirror_url="${AI_YOLO_MIRROR_URL:-}"
gdrive_id="${AI_YOLO_GDRIVE_FILE_ID:-}"
expected_sha="$(echo -n "${AI_YOLO_MODEL_SHA256:-}" | tr '[:upper:]' '[:lower:]')"

if [[ -z "$expected_sha" ]]; then
  echo "[fetch-yolo] AI_YOLO_MODEL_SHA256 is required (build integrity)." >&2
  exit 2
fi

mkdir -p "$(dirname "$dest")"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

fetch_mirror() {
  local url="$1"
  if [[ -s /run/secrets/ai_yolo_mirror_token ]]; then
    curl -sSfL -H "Authorization: Bearer $(cat /run/secrets/ai_yolo_mirror_token)" "$url" -o "$tmp"
  else
    curl -sSfL "$url" -o "$tmp"
  fi
}

fetch_gdrive() {
  local file_id="$1"
  local cookie_file body_file header_file content_type
  cookie_file="$(mktemp)"
  body_file="$(mktemp)"
  header_file="$(mktemp)"
  # shellcheck disable=SC2064
  trap "rm -f '$cookie_file' '$body_file' '$header_file' '$tmp'" EXIT

  curl -sSL -c "$cookie_file" -D "$header_file" \
    "https://drive.google.com/uc?export=download&id=${file_id}" \
    -o "$body_file"

  content_type="$(grep -i '^content-type:' "$header_file" | tail -1 | sed 's/^[^:]*:[[:space:]]*//' | tr '[:upper:]' '[:lower:]' || true)"

  if [[ "$content_type" != *"text/html"* ]]; then
    mv "$body_file" "$tmp"
    return
  fi

  # Large-file confirm flow (newer GDrive).
  local form_action confirm_value uuid_value second_url
  form_action="$(sed -n 's/.*action="\(https:\/\/drive\.usercontent\.google\.com\/download[^"]*\)".*/\1/p' "$body_file" | head -n 1)"
  confirm_value="$(sed -n 's/.*name="confirm"[[:space:]]*value="\([^"]\+\)".*/\1/p' "$body_file" | head -n 1)"
  uuid_value="$(sed -n 's/.*name="uuid"[[:space:]]*value="\([^"]\+\)".*/\1/p' "$body_file" | head -n 1)"

  if [[ -n "$form_action" && -n "$confirm_value" ]]; then
    second_url="${form_action}?id=${file_id}&export=download&confirm=${confirm_value}"
    [[ -n "$uuid_value" ]] && second_url="${second_url}&uuid=${uuid_value}"
    curl -sSL -b "$cookie_file" "$second_url" -o "$tmp"
    return
  fi

  # Legacy confirm flow.
  local confirm_token
  confirm_token="$(sed -n 's/.*confirm=\([0-9A-Za-z_]\+\).*/\1/p' "$body_file" | head -n 1)"
  if [[ -n "$confirm_token" ]]; then
    curl -sSL -b "$cookie_file" \
      "https://drive.google.com/uc?export=download&confirm=${confirm_token}&id=${file_id}" \
      -o "$tmp"
    return
  fi

  echo "[fetch-yolo] GDrive returned HTML without confirm token (file sharing or quota issue)." >&2
  exit 1
}

if [[ -n "$mirror_url" ]]; then
  echo "[fetch-yolo] Downloading from mirror..."
  fetch_mirror "$mirror_url"
elif [[ -n "$gdrive_id" ]]; then
  echo "[fetch-yolo] Downloading from Google Drive (id=${gdrive_id})..."
  fetch_gdrive "$gdrive_id"
else
  echo "[fetch-yolo] Provide AI_YOLO_MIRROR_URL or AI_YOLO_GDRIVE_FILE_ID." >&2
  exit 2
fi

actual_sha="$(sha256sum "$tmp" | awk '{print tolower($1)}')"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  echo "[fetch-yolo] SHA256 mismatch. expected=$expected_sha actual=$actual_sha" >&2
  exit 1
fi
echo "[fetch-yolo] SHA256 verified."

mv "$tmp" "$dest"
echo "[fetch-yolo] Saved to $dest"
