# AI Worker Service

## Mô tả

FastAPI worker xử lý AI jobs bất đồng bộ:
- OCR nhận diện tên thực phẩm từ ảnh bữa ăn
- Ước tính dinh dưỡng (calories, protein, carbs, fat)
- Chat/completion tasks qua OpenAI-compatible proxy nội bộ
- Local multilingual embeddings and citation prompt support for Medical RAG
- Rule-based health alert evaluation

## Port

`8001`

## Cấu trúc thư mục

```
app/
├── main.py           # FastAPI app, expose /analyze endpoint
├── __init__.py
├── tasks/            # Business logic AI tasks
│   ├── __init__.py
│   ├── food_recognition.py
│   └── nutrition_estimation.py
├── schemas/
│   ├── __init__.py
│   └── analysis.py   # AnalysisRequest, AnalysisResponse
└── adapters/
    ├── __init__.py
    └── storage.py    # Download/upload ảnh từ MinIO/S3
```

## Chạy local

```bash
cd services/ai-worker
cp ../../infra/env/worker.env.example .env
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Endpoint

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | Health check |
| POST | `/analyze` | Phân tích ảnh bữa ăn |
| POST | `/api/ai/chat` | Non-streaming proxy chat completion |
| POST | `/api/ai/chat/stream` | SSE proxy chat stream |
| POST | `/api/ai/embed` | Local 384-dimensional embeddings for Medical RAG |

## FoodDetector assets

- Model path (local): `services/ai-worker/models/yolov10/YOLOv10b_VietFood67_SGD_new_bigger.pt`
- Google Drive file id: `AI_YOLO_GDRIVE_FILE_ID` in `services/ai-worker/.env`
- Optional integrity hash: `AI_YOLO_MODEL_SHA256` (recommended for strict verification)
- Class database: `services/ai-worker/data/class_names.py`
- Meal photo scan is local YOLO-only. Missing model/class db returns a controlled analysis failure.
- Text generation uses `AI_PROXY_BASE_URL=http://localhost:20128/v1` and `AI_PROXY_MODEL=oc/deepseek-v4-flash-free`.
- `AI_PROXY_API_KEY` is optional; leave blank for a local proxy that does not require auth.
- DeepSeek thinking controls default to `AI_PROXY_THINKING_MODE=disabled`; set `enabled` with `AI_PROXY_REASONING_EFFORT=high|max` when the upstream proxy supports it.
- Chat replies default to `AI_CHAT_MAX_TOKENS=2048`; Core chat also sends a 2048-token reply budget so stale worker env files do not shrink normal dashboard answers.
- Embeddings use `AI_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` with `AI_EMBEDDING_DIMENSION=384`. The model loads lazily on first `/api/ai/embed` request.
- Chat requests may include backend-owned `rag_context` and `safety_context`. The worker formats source snippets as `[S1]`, `[S2]`, etc. only when sources are supplied, and treats snippets as untrusted evidence that cannot override safety rules.

Download model manually:

```powershell
.\infra\scripts\download-ai-model.ps1 -EnvFile .\services\ai-worker\.env
```

```bash
bash infra/scripts/download-ai-model.sh --env-file ./services/ai-worker/.env
```

## Credits and attribution

Tính năng nhận diện món ăn và nutrition được tích hợp từ dự án [FoodDetector](https://github.com/nvhnam/FoodDetector) với YOLOv10 trên VietFood67.

- Nguyen Viet Hoang Nam - Project Lead, YOLOv10 Trainer
- Tran Bao Tu - UI/UX Designer
- Ton That Minh Vu - Dataset Gathering
- Dr. Vi Chi Thanh - Research Supervisor

License gốc: MIT (Copyright © 2025 Nguyen Viet Hoang Nam).

Nếu sử dụng cho nghiên cứu/học thuật, cần trích dẫn đúng nguồn theo khuyến nghị của tác giả.
