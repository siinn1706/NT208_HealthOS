FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel \
	&& pip install -r requirements.txt

COPY . .

FROM base AS dev
COPY requirements-dev.txt ./
RUN pip install -r requirements-dev.txt
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]

# ── Model fetch stage (prod only) ─────────────────────────────────────────────
# Downloads + verifies the YOLO weights at build time so the prod image is
# self-contained. Two source modes:
#   * AI_YOLO_MIRROR_URL    — direct https URL (preferred for CI). Optional
#                             bearer token via BuildKit secret:
#                             docker buildx build --secret id=ai_yolo_mirror_token,src=token.txt
#   * AI_YOLO_GDRIVE_FILE_ID — public Google Drive id (default, no creds).
# AI_YOLO_MODEL_SHA256 is mandatory — the fetch script refuses to run without it.
FROM base AS model-fetch
ARG AI_YOLO_GDRIVE_FILE_ID=1n9tMmb2P5rAlIJsZrBB1wtjRmCKFreZc
ARG AI_YOLO_MODEL_SHA256=2e4a0cd266c5b723d67e5d5e9528114d87178cb453bab2f449beb0b19fd90465
ARG AI_YOLO_MODEL_PATH=models/yolov10/YOLOv10b_VietFood67_SGD_new_bigger.pt
ARG AI_YOLO_MIRROR_URL=""
ENV AI_YOLO_GDRIVE_FILE_ID=${AI_YOLO_GDRIVE_FILE_ID} \
	AI_YOLO_MODEL_SHA256=${AI_YOLO_MODEL_SHA256} \
	AI_YOLO_MIRROR_URL=${AI_YOLO_MIRROR_URL}
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN --mount=type=secret,id=ai_yolo_mirror_token,required=false \
	bash /app/scripts/fetch-yolo.sh "/app/${AI_YOLO_MODEL_PATH}"

FROM base AS prod
ARG AI_YOLO_MODEL_PATH=models/yolov10/YOLOv10b_VietFood67_SGD_new_bigger.pt
COPY --from=model-fetch /app/${AI_YOLO_MODEL_PATH} /app/${AI_YOLO_MODEL_PATH}
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
