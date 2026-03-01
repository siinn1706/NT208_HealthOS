# HealthOS — System Context

## Mô tả hệ thống

HealthOS là "bác sĩ cá nhân ảo": quản lý hồ sơ y tế, nhật ký dinh dưỡng, phân tích ảnh bữa ăn, kết nối wearable, cảnh báo realtime.

## Người dùng

| Actor | Mô tả |
|-------|--------|
| End User | Người dùng cuối sử dụng app web |
| Admin | Quản trị viên hệ thống |
| Wearable Device | Thiết bị đeo (Apple Health, Garmin, Fitbit, …) gửi dữ liệu tự động |

## Hệ thống ngoài (External Systems)

| Hệ thống | Ghi chú |
|----------|---------|
| Identity / OAuth Provider | Xác thực người dùng (Auth.js / OIDC) |
| Notification Gateway | Gửi email, push notification, SMS |
| Wearable APIs | Apple HealthKit, Google Fit, Garmin Connect, … |
| Object Storage (S3/MinIO) | Lưu ảnh bữa ăn, file tài liệu y tế |

## Tổng quan luồng dữ liệu chính

```
End User → FE (Next.js) → BFF (Route Handlers) → Core BE (FastAPI) → PostgreSQL
                                                ↓
                                         AI Worker (FastAPI) ← Queue/Worker
                                                                      ↑
                                         Wearable APIs ────────────────┘
                                         Notification Gateway ←──────────
```

## Tài liệu liên quan

- [Container Diagram](./container-diagram.md)
- [Data Flow](./data-flow.md)
- [Folder Convention](../standards/folder-convention.md)
