# HealthOS — Container Diagram

## Các container (deployment units) trong hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│  HealthOS — Internal Network                                        │
│                                                                     │
│  ┌──────────────────┐   HTTP    ┌──────────────────────────────┐   │
│  │ FE               │──────────▶│ BFF                          │   │
│  │ Next.js App      │           │ Next.js Route Handlers       │   │
│  │ Router           │           │ /api/v1/**                   │   │
│  │ Port: 3000       │           │ Port: 3000 (same process)    │   │
│  └──────────────────┘           └──────────────┬───────────────┘   │
│                                                │                    │
│  ┌──────────────────┐   HTTP (direct) ─────────┘                   │
│  │ Mobile           │──────────────────────────────────────────┐   │
│  │ Expo / RN 0.79   │  (see ADR below)                         │   │
│  └──────────────────┘                                          │   │
│                                                │ HTTP               │
│                                  ┌─────────────▼──────────────┐    │
│                                  │ Core BE                    │    │
│                                  │ FastAPI                    │    │
│                                  │ REST + WebSocket           │    │
│                                  │ Port: 8000                 │    │
│                                  └─────┬────────┬─────────────┘    │
│               Data I/O ────────────────┘        │ Async Job        │
│         ┌─────────────────┐              ┌──────▼──────────┐       │
│         │ PostgreSQL      │              │ Queue/Worker    │       │
│         │ Port: 5432      │              │ Celery + Redis  │       │
│         └─────────────────┘              └──────┬──────────┘       │
│                                                 │ HTTP              │
│  ┌──────────────────┐   Data I/O  ┌─────────────▼──────────────┐  │
│  │ Object Storage   │◀────────────│ AI Worker                  │  │
│  │ MinIO / S3       │             │ FastAPI (background jobs)  │  │
│  │ Port: 9000       │             │ Port: 8001                 │  │
│  └──────────────────┘             └────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────┐                                              │
│  │ Redis            │  (Cache / Pub-Sub / Rate-Limit)             │
│  │ Port: 6379       │                                              │
│  └──────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────┘

External:
- Identity/OAuth   (HTTPS)
- Notification GW  (HTTPS — email, push, SMS)
- Wearable APIs    (HTTPS — Apple Health, Google Fit, Garmin, …)
```

## Trách nhiệm từng container

| Container | Stack | Trách nhiệm |
|-----------|-------|-------------|
| FE | Next 16 + App Router | UI, i18n, routing, SSR/SSG |
| BFF | Next Route Handlers `/api/v1/**` | Auth session, API aggregation, proxy tới Core BE, bảo vệ CORS/key |
| Core BE | FastAPI 0.x | REST API nghiệp vụ, WebSocket realtime, orchestrate service khác |
| AI Worker | FastAPI + background tasks | OCR, food recognition, nutrition estimation, rule-based alert |
| Queue/Worker | Celery + Redis broker | Async jobs: process ảnh, batch sync wearable, gửi notify |
| PostgreSQL | Postgres 16 | RDBMS chính: user, health records, nutrition logs |
| Redis | Redis 7 | Cache query, pub/sub realtime, rate-limit, Celery broker |
| Object Storage | MinIO (local) / S3 (prod) | Binary blobs: ảnh bữa ăn, tài liệu y tế |

## ADR-001: Mobile → Core BE direct connection (C1 exemption)

**Decision**: The mobile app (Expo/React Native) calls Core BE directly via `EXPO_PUBLIC_CORE_API_URL`, bypassing the Next.js BFF layer.

**Rationale**:
- Native mobile clients are a distinct deployment target from browser SPAs. The BFF pattern addresses browser-specific concerns (cookie-based session, CORS, SSR hydration) that do not apply to a native app with `expo-secure-store`.
- Routing mobile traffic through the web BFF would introduce an unnecessary network hop and couple the mobile release cycle to the Next.js deployment.
- Auth is handled natively: JWT stored in SecureStore, `Authorization: Bearer` header on every request.

**Constraints**:
- Mobile MUST use HTTPS in production (`getCoreApiBaseUrl()` warns if `http://` detected outside `__DEV__`).
- Mobile MUST handle 401 with token refresh before hard logout (see H2 in code-review plan).
- Any new Core BE endpoint must also be considered for BFF exposure if the web frontend needs it.

**Status**: Accepted — 2026-05-15.

## Ports chuẩn (local dev)

| Service | Port |
|---------|------|
| FE + BFF | 3000 |
| Core BE | 8000 |
| AI Worker | 8001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
