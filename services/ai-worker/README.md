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

## FoodDetector assets

- Model path (local): `services/ai-worker/models/yolov10/YOLOv10b_VietFood67_SGD_new_bigger.pt`
- Class database: `services/ai-worker/data/class_names.py`
- Team key: `GEMINI_API_KEY` dùng chung qua file env nội bộ, không commit
- Khi thiếu model/class db, service sẽ tự fallback qua Gemini để vẫn trả nutrition.

## Credits and attribution

Tính năng nhận diện món ăn và nutrition được tích hợp từ dự án [FoodDetector](https://github.com/nvhnam/FoodDetector) với YOLOv10 trên VietFood67.

- Nguyen Viet Hoang Nam - Project Lead, YOLOv10 Trainer
- Tran Bao Tu - UI/UX Designer
- Ton That Minh Vu - Dataset Gathering
- Dr. Vi Chi Thanh - Research Supervisor

License gốc: MIT (Copyright © 2025 Nguyen Viet Hoang Nam).

Nếu sử dụng cho nghiên cứu/học thuật, cần trích dẫn đúng nguồn theo khuyến nghị của tác giả.
