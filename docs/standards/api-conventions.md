# HealthOS — API Conventions

## Versioning

- Tất cả endpoint đặt dưới prefix `/v1/`.
- Khi có breaking change → tạo `/v2/`, giữ `/v1/` ít nhất 1 sprint.
- BFF prefix: `/api/v1/` (Next route handlers).
- Core BE prefix: `/v1/` (FastAPI router).

## URL Structure

```
/v1/{resource}              # Collection
/v1/{resource}/{id}         # Single item
/v1/{resource}/{id}/{sub}   # Sub-resource

Examples:
GET  /v1/users
GET  /v1/users/{id}
GET  /v1/users/{id}/meals
POST /v1/meals
```

**Quy tắc:**
- Dùng **kebab-case** (ví dụ `/health-data`, không `/healthData`).
- Noun plural cho resource (`/meals`, `/health-metrics`).
- Không động từ trong path (`/v1/create-meal` là sai).

## HTTP Methods

| Method | Dùng khi |
|--------|----------|
| `GET` | Đọc resource, idempotent |
| `POST` | Tạo resource mới hoặc action không idempotent |
| `PUT` | Thay thế hoàn toàn resource |
| `PATCH` | Update một phần resource |
| `DELETE` | Xoá resource |

## Response Envelope

Tất cả API (BFF và Core BE) trả response theo cấu trúc thống nhất:

```json
// Success
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}

// Error
{
  "error": {
    "code": "MEAL_NOT_FOUND",
    "message": "Meal with id 42 was not found.",
    "details": {}
  }
}
```

**Quy tắc:** Không bao giờ trả status 200 kèm `error` trong body.

## HTTP Status Codes

| Code | Dùng khi |
|------|----------|
| 200 | OK — GET, PUT, PATCH thành công |
| 201 | Created — POST tạo resource thành công |
| 204 | No Content — DELETE, hoặc action không có body |
| 400 | Bad Request — validation fail |
| 401 | Unauthorized — thiếu/hết hạn token |
| 403 | Forbidden — có token nhưng không có quyền |
| 404 | Not Found |
| 409 | Conflict — duplicate, optimistic lock fail |
| 422 | Unprocessable Entity — semantic error (FastAPI default) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Pagination

```
GET /v1/meals?page=2&per_page=20&sort=created_at&order=desc
```

Response `meta` luôn bao gồm `page`, `per_page`, `total`.

## Authentication Flow (BFF ↔ Core BE)

```
Browser → BFF (session cookie, httpOnly)
BFF     → Core BE (Bearer token trong Authorization header)
Core BE → verify JWT
```

- FE không bao giờ nhìn thấy Bearer token.
- BFF đọc session, lấy access token, forward tới Core BE.
- Token expiry: Core BE trả 401 → BFF refresh hoặc redirect login.

## WebSocket

```
WS /ws?token=<jwt>&room=user:<id>
```

- Authenticate qua query param `token` (JWT).
- Join room theo `user:{id}` hoặc `session:{id}`.
- Event format:

```json
{
  "event": "meal.analyzed",
  "payload": { ... },
  "timestamp": "2026-03-01T12:00:00Z"
}
```

## Error Codes (chuẩn hóa)

| Code | Nghĩa |
|------|--------|
| `AUTH_REQUIRED` | Chưa đăng nhập |
| `FORBIDDEN` | Không có quyền |
| `NOT_FOUND` | Resource không tồn tại |
| `VALIDATION_ERROR` | Input không hợp lệ |
| `CONFLICT` | Trùng lặp dữ liệu |
| `RATE_LIMITED` | Quá nhiều request |
| `UPSTREAM_ERROR` | Lỗi từ service ngoài (Wearable API, …) |
| `PROCESSING` | Job đang xử lý async |
