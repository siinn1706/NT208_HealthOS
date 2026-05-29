#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/services/ai-worker/.env}"
REQUIRE_SHA256=0
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --require-sha256)
      REQUIRE_SHA256=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    *)
      echo "[MODEL] Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[MODEL] Env file not found: $ENV_FILE" >&2
  exit 1
fi

read_env_value() {
  local key="$1"
  rg -N "^${key}=" "$ENV_FILE" -m 1 | sed "s/^${key}=//" | sed 's/^["'\'']//; s/["'\'']$//' || true
}

sha256_file() {
  local file_path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print tolower($1)}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print tolower($1)}'
  else
    echo "[MODEL] Missing sha256 tool (sha256sum/shasum)." >&2
    exit 1
  fi
}

resolve_model_path() {
  local raw_path="$1"
  local env_dir
  env_dir="$(cd "$(dirname "$ENV_FILE")" && pwd)"

  if [[ "$raw_path" == /* ]]; then
    printf "%s" "$raw_path"
  else
    (
      cd "$env_dir"
      python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$raw_path"
    )
  fi
}

download_from_gdrive() {
  local file_id="$1"
  local dest_path="$2"
  local cookie_file body_file header_file confirm_token content_type

  cookie_file="$(mktemp)"
  body_file="$(mktemp)"
  header_file="$(mktemp)"

  cleanup_tmp() {
    rm -f "$cookie_file" "$body_file" "$header_file"
  }
  trap cleanup_tmp RETURN

  curl -sSL -c "$cookie_file" -D "$header_file" \
    "https://drive.google.com/uc?export=download&id=${file_id}" \
    -o "$body_file"

  content_type="$(rg -N '^content-type:' "$header_file" -i | sed 's/^[^:]*:[[:space:]]*//' | tr '[:upper:]' '[:lower:]' || true)"

  # Plain binary response — first request already returned the file.
  if [[ "$content_type" != *"text/html"* ]]; then
    mv "$body_file" "$dest_path"
    return
  fi

  # Newer GDrive flow (large files): hidden form posts to drive.usercontent.google.com.
  # confirm value is now fixed ("t"); uuid is per-request.
  local form_action confirm_value uuid_value second_url
  form_action="$(sed -n 's/.*action="\(https:\/\/drive\.usercontent\.google\.com\/download[^"]*\)".*/\1/p' "$body_file" | head -n 1)"
  confirm_value="$(sed -n 's/.*name="confirm"[[:space:]]*value="\([^"]\+\)".*/\1/p' "$body_file" | head -n 1)"
  uuid_value="$(sed -n 's/.*name="uuid"[[:space:]]*value="\([^"]\+\)".*/\1/p' "$body_file" | head -n 1)"

  if [[ -n "$form_action" && -n "$confirm_value" ]]; then
    second_url="${form_action}?id=${file_id}&export=download&confirm=${confirm_value}"
    if [[ -n "$uuid_value" ]]; then
      second_url="${second_url}&uuid=${uuid_value}"
    fi
    curl -sSL -b "$cookie_file" "$second_url" -o "$dest_path"
    return
  fi

  # Legacy GDrive flow: confirm token embedded in querystring of body.
  confirm_token="$(sed -n 's/.*confirm=\([0-9A-Za-z_]\+\).*/\1/p' "$body_file" | head -n 1)"
  if [[ -n "$confirm_token" ]]; then
    curl -sSL -b "$cookie_file" \
      "https://drive.google.com/uc?export=download&confirm=${confirm_token}&id=${file_id}" \
      -o "$dest_path"
    return
  fi

  echo "[MODEL] Google Drive returned HTML without confirm token. Check file sharing and id." >&2
  exit 1
}

DEFAULT_FILE_ID="1n9tMmb2P5rAlIJsZrBB1wtjRmCKFreZc"
DEFAULT_MODEL_PATH="./models/yolov10/YOLOv10b_VietFood67_SGD_new_bigger.pt"

FILE_ID="$(read_env_value "AI_YOLO_GDRIVE_FILE_ID")"
RAW_MODEL_PATH="$(read_env_value "AI_YOLO_MODEL_PATH")"
EXPECTED_SHA="$(read_env_value "AI_YOLO_MODEL_SHA256" | tr '[:upper:]' '[:lower:]')"

if [[ -z "$FILE_ID" ]]; then
  FILE_ID="$DEFAULT_FILE_ID"
  echo "[MODEL] AI_YOLO_GDRIVE_FILE_ID is missing. Using default id from worker template."
fi

if [[ -z "$RAW_MODEL_PATH" ]]; then
  RAW_MODEL_PATH="$DEFAULT_MODEL_PATH"
  echo "[MODEL] AI_YOLO_MODEL_PATH is missing. Using default model path."
fi

if [[ "$REQUIRE_SHA256" -eq 1 && -z "$EXPECTED_SHA" ]]; then
  echo "[MODEL] --require-sha256 is set but AI_YOLO_MODEL_SHA256 is empty." >&2
  exit 1
fi

MODEL_PATH="$(resolve_model_path "$RAW_MODEL_PATH")"
MODEL_DIR="$(dirname "$MODEL_PATH")"
mkdir -p "$MODEL_DIR"

if [[ -f "$MODEL_PATH" && "$FORCE" -eq 0 ]]; then
  if [[ -n "$EXPECTED_SHA" ]]; then
    EXISTING_SHA="$(sha256_file "$MODEL_PATH")"
    if [[ "$EXISTING_SHA" == "$EXPECTED_SHA" ]]; then
      echo "[MODEL] Existing model hash matches. Skip download."
      exit 0
    fi
    echo "[MODEL] Existing model hash mismatch. Re-downloading..."
  else
    echo "[MODEL] Model already exists and SHA256 is not configured. Skip download."
    exit 0
  fi
fi

TMP_DOWNLOAD="$(mktemp)"
cleanup_download() {
  rm -f "$TMP_DOWNLOAD"
}
trap cleanup_download EXIT

echo "[MODEL] Downloading model from Google Drive (id=$FILE_ID)..."
download_from_gdrive "$FILE_ID" "$TMP_DOWNLOAD"

if [[ -n "$EXPECTED_SHA" ]]; then
  ACTUAL_SHA="$(sha256_file "$TMP_DOWNLOAD")"
  if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
    echo "[MODEL] SHA256 mismatch. expected=$EXPECTED_SHA actual=$ACTUAL_SHA" >&2
    exit 1
  fi
  echo "[MODEL] SHA256 verified."
elif [[ "$REQUIRE_SHA256" -eq 1 ]]; then
  echo "[MODEL] SHA256 is required but AI_YOLO_MODEL_SHA256 is empty." >&2
  exit 1
else
  echo "[MODEL] SHA256 not configured. Download accepted without integrity verification."
fi

mv "$TMP_DOWNLOAD" "$MODEL_PATH"
echo "[MODEL] Saved model to $MODEL_PATH"
