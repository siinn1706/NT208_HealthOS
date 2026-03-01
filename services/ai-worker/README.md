# AI Worker Service

## Mô tả

FastAPI worker xử lý AI jobs bất đồng bộ:
- OCR nhận diện tên thực phẩm từ ảnh bữa ăn
- Ước tính dinh dưỡng (calories, protein, carbs, fat)
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
