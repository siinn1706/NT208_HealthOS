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
│  ┌──────────────────┐   HTTP (via BFF) ─────────┘                  │
│  │ Mobile           │──────────────────────────────────────────┐   │
│  │ Expo / RN 0.79   │  REST → BFF; WS → public gateway         │   │
│  └──────────────────┘  (see ADR-001 below)                     │   │
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

## ADR-001: Public WebSocket Gateway

**Decision**: All clients (web and mobile) connect to WebSocket via the public gateway (`wss://healthos.page`, Cloudflare Tunnel → `core-be:8000`). Core BE port 8000 is internal-only. Mobile REST traffic routes via the Next.js BFF, not directly to Core BE. Auth uses a short-lived `ws_ticket` minted by BFF `GET /api/v1/auth/ws-token`, sent as the first WS frame.

**Rationale**:
- Core port 8000 must not be publicly reachable. Gateway passthrough (Cloudflare Tunnel) decouples public origin from internal service address.
- Short-lived ticket auth prevents long-lived JWT exposure in WS handshake URLs.
- Unified gateway origin simplifies client config (`NEXT_PUBLIC_WS_URL` / `EXPO_PUBLIC_WS_URL` — base only, no path suffix).

**Constraints**:
- Ops must expose both `/ws` and `/v1/chat/ws/{id}` paths in cloudflared config (off-repo).
- Env vars `NEXT_PUBLIC_CORE_WS_URL` / `EXPO_PUBLIC_CORE_WS_URL` deprecated; removed 2026-09-01.
- Mobile keeps `ws://10.0.2.2:8000` / `ws://localhost:8000` fallback for emulator dev only.

**Status**: Accepted — 2026-06-05. Full spec: [decisions/adr-001-public-ws-gateway.md](./decisions/adr-001-public-ws-gateway.md).

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
