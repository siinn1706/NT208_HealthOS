# HealthOS — Data Flow

## Luồng 1a: User đăng nhập (Browser)

```
Browser → FE (Next)
  → BFF /api/v1/auth/session (Route Handler)
    → Identity/OAuth Provider (redirect)
    ← access_token + refresh_token
  → set httpOnly cookie
  ← redirect về dashboard
```

## Luồng 1b: User đăng nhập (Mobile App)

```
Mobile (Expo/RN) → Core BE POST /v1/auth/login
  json: { identifier, password }
  ← { access_token, refresh_token, user_id, email, ... }
  → save access_token + refresh_token to SecureStore (expo-secure-store)
  ← next: show dashboard

Mobile on 401 response:
  → detect 401 (concurrent requests dedup via refreshPromise singleton)
  → POST /v1/auth/refresh { refresh_token }
  ← { new access_token, new refresh_token }
  → update SecureStore with new tokens
  → retry original request with new Authorization header
  ← success or clear session if refresh fails
```

## Luồng 2: Ghi nhật ký bữa ăn (ảnh)

```
User chụp ảnh
  → FE upload form
  → BFF /api/v1/health-data/meal  (POST multipart)
    → Core BE POST /v1/meals
      → lưu metadata vào PostgreSQL
      → upload ảnh gốc lên Object Storage
      → enqueue task vào Queue (Celery)
      ← trả ngay { meal_id, status: "processing" }
    ← BFF trả { meal_id, status: "processing" }
  FE subscribe WebSocket /ws?room=user:{id}
  Queue Worker xử lý:
    → pull task
    → AI Worker POST /analyze (food recognition + nutrition)
    ← kết quả nutrition
    → update DB meal.nutrition_result
    → publish event ws → Core BE → FE via WebSocket
  FE nhận WS event, cập nhật UI realtime
```

## Luồng 3: Đồng bộ dữ liệu wearable

```
Scheduler (Celery Beat)
  → enqueue "sync_wearable" task mỗi 15 phút
Queue Worker:
  → gọi Wearable API (Apple Health / Garmin / Google Fit)
  ← raw health data
  → normalize + validate
  → upsert vào PostgreSQL (health_metrics)
  → kiểm tra rule-based alert
  → nếu vi phạm ngưỡng: enqueue "send_notification" task
Notification Worker:
  → gọi Notification Gateway (email / push / SMS)
```

## Luồng 4: Truy vấn lịch sử sức khỏe

```
FE → BFF /api/v1/health-data?range=30d
  → Core BE GET /v1/health-metrics?user_id=X&range=30d
    → check Redis cache
    → nếu miss: query PostgreSQL, set cache TTL 5 phút
    ← trả data
  ← BFF forward response
  FE render chart
```

## Quy tắc bắt buộc cho luồng dữ liệu

1. **FE không được gọi thẳng Core BE** — mọi request phải qua BFF.
2. **BFF không chứa business logic** — chỉ aggregate, auth check, forward.
3. **Core BE không block request lâu** — công việc nặng (AI, batch) phải enqueue.
4. **Workers không expose HTTP ra ngoài** — chỉ communicate qua Queue/Core BE.
5. **Mọi event async phải có schema chuẩn** — xem `contracts/events/`.
