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
