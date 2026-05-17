# HealthOS — System Context

## Mô tả hệ thống

HealthOS là "bác sĩ cá nhân ảo": quản lý hồ sơ y tế, nhật ký dinh dưỡng, phân tích ảnh bữa ăn, kết nối wearable, cảnh báo realtime.

## Người dùng / Clients

| Actor | Mô tả |
|-------|--------|
| End User (Browser) | Sử dụng app web qua Next.js FE + BFF |
| End User (Mobile) | Sử dụng app native (Expo/React Native) gọi Core BE trực tiếp (see ADR-001) |
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
Browser          FE (Next.js)
  End User   →     ↓
              BFF (Route Handlers)
                    ↓
                    ↓ (HTTP)
Mobile          ──→ Core BE (FastAPI) → PostgreSQL
  End User   ──┘       ↓
            (HTTP)  AI Worker (FastAPI) ← Queue/Worker
                           ↑
              Wearable APIs ────────────
              Notification Gateway ←─────
```

**Note**: Browser clients use BFF layer (cookie-based auth, CORS mitigation). Mobile clients call Core BE directly (see ADR-001).

## Tài liệu liên quan

- [Container Diagram](./container-diagram.md)
- [Data Flow](./data-flow.md)
- [Folder Convention](../standards/folder-convention.md)
