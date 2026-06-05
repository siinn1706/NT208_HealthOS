# HealthOS — System Context

## Mô tả hệ thống

HealthOS là "bác sĩ cá nhân ảo": quản lý hồ sơ y tế, nhật ký dinh dưỡng, phân tích ảnh bữa ăn, kết nối wearable, cảnh báo realtime.

## Người dùng / Clients

| Actor | Mô tả |
|-------|--------|
| End User (Browser) | Sử dụng app web qua Next.js FE + BFF |
| End User (Mobile) | Sử dụng app native (Expo/React Native); REST qua BFF, WebSocket qua public gateway (see ADR-001) |
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
              BFF (Route Handlers) ──→ Core BE (FastAPI) → PostgreSQL
                    │                       ↓
                    │ ws-ticket mint    AI Worker (FastAPI) ← Queue/Worker
                    ↓                          ↑
Mobile       Public WS Gateway        Wearable APIs ────────
  End User   →  (Cloudflare Tunnel)   Notification Gateway ←─
              └─→ BFF (REST)
```

**Note**: All REST traffic goes via BFF layer. WebSocket (both web and mobile) connects to the public gateway (`wss://healthos.page`), which tunnels to Core BE. See [ADR-001](./decisions/adr-001-public-ws-gateway.md).

## Tài liệu liên quan

- [Container Diagram](./container-diagram.md)
- [Data Flow](./data-flow.md)
- [Folder Convention](../standards/folder-convention.md)
