# NT208 HealthOS — System Architecture

> **Version**: 1.2.2  
> **Last Updated**: 2026-05-21  
> **Scope**: Web + Mobile + Microservices + Background Tasks

---

## Architecture Overview

HealthOS follows a **BFF (Backend-for-Frontend) pattern** for web and direct **REST + WebSocket** for mobile.

### Web Request Flow
```
Browser (HTTPS)
    ↓
Next.js BFF (port 3000)
    ├─ Authorization (httpOnly cookie)
    ├─ Rate limit pre-flight (Redis)
    └─ Proxy request
        ↓
Core API (port 8000, internal)
    ├─ FastAPI + SQLAlchemy async
    ├─ Validate input (Pydantic)
    ├─ Check JWT in blacklist (Redis)
    ├─ Apply rate limits (Redis)
    └─ Process request
        ↓
Data Layer (internal network)
    ├─ PostgreSQL 16 (persistent data)
    ├─ Redis 7 (cache, sessions, task queue)
    └─ MinIO (object storage)
        ↓
Response (JSON/binary)
    ↓
Browser (HTTPS)
```

### Mobile Request Flow
```
Mobile App (HTTPS via Expo)
    ↓
Core API (port 8000)
    ├─ Authorization (Bearer token from SecureStore)
    ├─ Rate limiting (Redis)
    ├─ JWT validation (check blacklist)
    └─ Process request
        ↓
Data Layer (PostgreSQL, Redis, MinIO)
        ↓
Response (JSON)
    ↓
Mobile App (AsyncStorage cache)
```

### Real-time Chat (WebSocket)
```
Browser/Mobile (WSS)
    ↓
Core API WebSocket (port 8000/ws)
    ├─ Upgrade HTTP → WebSocket
    ├─ Authenticate with JWT token
    ├─ Add to in-memory connection manager
    └─ Subscribe to room (conversation_id)
        ↓
Message received
    ├─ Validate input (Pydantic)
    ├─ Persist to PostgreSQL
    ├─ Publish to Redis Pub/Sub
    │   (all connected clients receive)
    └─ Send to all subscribers
        ↓
Browser/Mobile receives message (real-time)
```

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────┐            │
│  │   Web Browser    │          │  Mobile App      │            │
│  │  (React + TS)    │          │ (React Native)   │            │
│  │                  │          │                  │            │
│  │ • Dashboard      │          │ • Home tab       │            │
│  │ • Chat           │          │ • Care hub       │            │
│  │ • Settings       │          │ • Meds           │            │
│  └────────┬─────────┘          └────────┬─────────┘            │
│           │ HTTPS                       │ HTTPS                │
└───────────┼───────────────────────────────┼────────────────────┘
            │                               │
            ↓ (BFF only)                    ↓ (Direct)
┌───────────────────────────────────────────────────────────────┐
│                   GATEWAY / API LAYER                         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐                ┌─────────────────────┐ │
│  │ Next.js BFF     │                │  FastAPI Core       │ │
│  │ (port 3000)     │────HTTPS──────▶│  (port 8000)        │ │
│  │                 │                │                     │ │
│  │ • Routes        │                │ • 30+ endpoints     │ │
│  │ • Auth proxy    │                │ • Validation        │ │
│  │ • Rate limit    │                │ • Rate limiting     │ │
│  │ • Error norm.   │                │ • WebSocket (WSS)   │ │
│  └─────────────────┘                │ • JWT validation    │ │
│           ▲                         └────────┬─────────────┘ │
│           │ (session cookie)                │               │
│           └─────────────────────────────────┘               │
│                                                             │
└──────────────────────────────┬──────────────────────────────┘
                               │ (async, auth-required)
┌──────────────────────────────┴──────────────────────────────┐
│                    SERVICE LAYER                           │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Auth Service │ │ Chat Service │ │ Health Service   │  │
│  ├──────────────┤ ├──────────────┤ ├──────────────────┤  │
│  │ • Login      │ │ • Messages   │ │ • Vitals         │  │
│  │ • Register   │ │ • Reactions  │ │ • Goals          │  │
│  │ • MFA        │ │ • Presence   │ │ • Risk predict   │  │
│  │ • OAuth      │ │ • Pinned     │ │ • Trend analysis │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
│                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Meal Service │ │ Reminder Svc │ │ Appointment Svc  │  │
│  ├──────────────┤ ├──────────────┤ ├──────────────────┤  │
│  │ • Nutrition  │ │ • Recurring  │ │ • Schedule       │  │
│  │ • Analysis   │ │ • Firing     │ │ • Notes          │  │
│  │ • History    │ │ • Quiet hrs  │ │ • Cancellation   │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
│                                                            │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────┐
│                    DATA LAYER                           │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────┐   ┌─────────────────────┐   │
│  │ PostgreSQL 16       │   │ Redis 7             │   │
│  │ (Primary storage)   │   │ (Cache + Queue)     │   │
│  ├─────────────────────┤   ├─────────────────────┤   │
│  │ • Users             │   │ • Session cache     │   │
│  │ • Health metrics    │   │ • OTP store         │   │
│  │ • Conversations     │   │ • Rate limiter      │   │
│  │ • Reminders         │   │ • Celery task queue │   │
│  │ • Audit logs        │   │ • Token blacklist   │   │
│  │ • Messages          │   │ • Pub/Sub (WS)      │   │
│  └─────────────────────┘   └─────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ MinIO / S3-compatible (Object storage)          │  │
│  │ • User profile pictures                         │  │
│  │ • Meal photos                                   │  │
│  │ • PDF exports                                   │  │
│  │ • Audit log backups                             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│         BACKGROUND TASK LAYER (Celery)            │
├────────────────────────────────────────────────────┤
│                                                    │
│  Celery Beat (Scheduler)                          │
│    ├─ Every 5 min: Materialize daily reminders   │
│    ├─ Every 1 min: Fire due reminders            │
│    ├─ Daily 06:00: Email med refill alerts       │
│    └─ Daily 03:00: Purge soft-deleted accounts   │
│         ↓                                         │
│  Redis (Task queue)                              │
│         ↓                                         │
│  Celery Worker(s)                                │
│    ├─ process_meal_image (→ AI Worker)           │
│    ├─ send_notification (→ Notification service) │
│    └─ sync_wearable_data (stub)                  │
│                                                   │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│         EXTERNAL SERVICES & WORKERS               │
├────────────────────────────────────────────────────┤
│                                                    │
│  AI Worker (port 8001)                           │
│    • YOLOv10 food detection (local inference)    │
│    • Gemini API fallback for chat                │
│                                                    │
│  Notification Service (port 8002)                │
│    • Push notifications (FCM, APNs) [stub]       │
│    • Email dispatch (SendGrid) [stub]            │
│                                                    │
│  External APIs                                    │
│    • Google OAuth                                 │
│    • GitHub OAuth                                │
│    • HIBP (Have I Been Pwned)                     │
│    • Gemini API (meal photo fallback)             │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Service Ports Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend (Next.js BFF) | 3000 | HTTP/HTTPS | Web UI + BFF route handlers |
| Core API (FastAPI) | 8000 | HTTP/HTTPS + WSS | REST endpoints + WebSocket |
| AI Worker | 8001 | HTTP | Meal detection + Gemini fallback |
| Notification Service | 8002 | HTTP | Push/email dispatch (stub) |
| PostgreSQL | 5432 | TCP | Database (internal) |
| Redis | 6379 | TCP | Cache + queue (internal) |
| MinIO | 9000/9001 | HTTP | S3-compatible storage + console |

---

## Data Flow Examples

### 1. User Login Flow

```
Browser (POST /api/v1/auth/login)
    ↓ [email, password]
BFF Route Handler
    ├─ Check rate limit (Redis)
    ├─ Call coreProxy('/v1/auth/login')
    └─ Set httpOnly session cookie (contains JWT)
        ↓
Core API (POST /v1/auth/login)
    ├─ Fetch user by email
    ├─ Verify password (bcrypt)
    ├─ Check HIBP for breach (async)
    ├─ Generate JWT with jti claim
    ├─ Return access_token + refresh_token
        ↓
BFF Route Handler
    ├─ Parse response
    ├─ Set httpOnly cookie (refresh_token)
    └─ Return JSON to browser
        ↓
Browser
    ├─ Store JWT in cookie (httpOnly)
    ├─ Redirect to /dashboard
    └─ On next request, cookie auto-sent in Authorization header
```

### 2. Chat Message Flow (WebSocket)

```
Browser (WSS /ws/chat/conversation_id)
    ↓ [message: "How are you?"]
Core API WebSocket Handler
    ├─ Authenticate JWT token
    ├─ Add to connection manager (in-memory list)
    ├─ Parse message (Pydantic validation)
    ├─ Persist to PostgreSQL (Message table)
    ├─ Publish to Redis Pub/Sub (channel: conversation_id)
    └─ Return OK
        ↓
Redis Pub/Sub
    ├─ Broadcast to all subscribers of conversation_id
    └─ Each connected client receives (in-memory listener)
        ↓
Browser + Other participants
    ├─ Receive message object
    ├─ Append to messages state
    └─ Render in UI (real-time)
```

### 3. Reminder Firing Flow (Background Task)

```
Celery Beat (every 1 minute)
    ├─ Query: SELECT * FROM reminder_occurrences WHERE due_time <= NOW()
    └─ Enqueue task: fire_reminders(reminder_ids)
        ↓
Redis Task Queue
        ↓
Celery Worker
    ├─ Dequeue task
    ├─ For each reminder:
    │   ├─ Fetch user preference (notification channel)
    │   ├─ Enqueue task: send_notification(user_id, reminder_id)
    │   └─ Mark occurrence as fired (PostgreSQL)
    └─ Return
        ↓
Redis Task Queue (send_notification job)
        ↓
Celery Worker
    ├─ Call Notification Service (port 8002)
    ├─ Request: { type: 'push' | 'email', user_id, reminder_id }
    └─ Return
        ↓
Notification Service
    ├─ Queue notification (database)
    ├─ Call external service (FCM, SendGrid) [stub for now]
    └─ Return
        ↓
User receives notification (push/email/in-app)
```

### 4. Meal Photo Analysis Flow

```
Mobile App (POST /api/v1/meals/analyze-photo)
    ├─ Select photo from camera roll
    ├─ Encode as multipart/form-data
    └─ Send with Authorization header (Bearer token)
        ↓
Core API (POST /v1/meals/analyze)
    ├─ Validate JWT token
    ├─ Fetch image from request
    ├─ Enqueue async task: process_meal_image(user_id, image_data)
    └─ Return { job_id: "uuid", status: "processing" }
        ↓
Mobile App
    ├─ Store job_id
    ├─ Poll (GET /api/v1/meals/analyze-photo/[job_id]) every 1-2 sec
    └─ Show loading spinner
        ↓
Celery Worker (async)
    ├─ Receive task: process_meal_image
    ├─ Call AI Worker (port 8001, POST /analyze)
    │   ├─ Send: image bytes
    │   └─ Receive: { detected_items: [...], nutrition: {...} }
    ├─ Store result in PostgreSQL (MealResult)
    ├─ Update Redis job status (job_id → result)
    └─ Return
        ↓
Mobile App (polling)
    ├─ GET /api/v1/meals/analyze-photo/[job_id]
    ├─ Receive: { status: "complete", result: {...} }
    └─ Display nutrition breakdown, macros, suggestions
```

---

## Authentication & Authorization

### JWT Token Lifecycle

```
Login Request
    ↓
Core API validates email + password
    ↓
Generate JWT:
  {
    "sub": user_id,
    "jti": "unique_token_id",
    "iat": 1234567890,
    "exp": 1234571490,
    "iss": "healthos",
    "aud": "healthos-users"
  }
    ↓
Set httpOnly cookie (session)
Set refresh_token cookie (for token refresh)
    ↓
Browser (next request)
    ├─ Auto-send httpOnly cookies
    └─ BFF checks Authorization header or cookie
        ↓
Core API
    ├─ Decode JWT
    ├─ Check jti NOT in Redis blacklist
    ├─ Check exp > now
    ├─ Check iss + aud (TODO: enforce in v1.3)
    └─ Allow request ✅
        ↓
Logout Request
    ↓
BFF adds JWT jti to Redis blacklist (ttl = token_lifetime)
    ↓
Future requests
    ├─ JWT decoded
    ├─ jti found in blacklist
    └─ Request rejected (401) ❌
```

### MFA Flow (TOTP)

```
User enables MFA
    ↓
Backend generates TOTP secret (pyotp)
    ├─ Encrypt with Fernet (AES-128)
    └─ Store in database (UserMfaSecret.encrypted_secret)
        ↓
User scans QR code (Google Authenticator, Authy, etc.)
    └─ TOTP app generates 6-digit codes (30-sec roll)
        ↓
Login with email + password
    ↓
Backend validates password ✅
    ↓
Check: is_mfa_enabled?
    ├─ NO → Set session cookie, return JWT ✅
    └─ YES → Return challenge (status: "mfa_required")
        ↓
Frontend prompts user for TOTP code
    ↓
POST /v1/auth/verify-mfa { code: "123456" }
    ↓
Backend
    ├─ Decrypt TOTP secret (Fernet)
    ├─ Verify code (pyotp.totp.verify with ±30sec tolerance)
    ├─ Success → Set session cookie, return JWT ✅
    └─ Failure → Reject (401) ❌
        ↓
**Known Gap**: Password login does not enforce MFA challenge
  even when mfa_enabled=true (TODO v1.3)
```

### Rate Limiting Strategy

```
Request arrives at Core API
    ↓
Determine limiter bucket:
  • Login attempts: key = "login:{ip}:{email}", limit = 10/min
  • OTP requests: key = "otp:{ip}:{email}", limit = 5/min
  • API requests: key = "api:{ip}:{user_id}", limit = 30/min
  • WebSocket msgs: per-connection burst = 10/sec
    ↓
Redis INCR key (increment counter)
    ├─ First increment → SET TTL (60 sec for rate limits)
    └─ Return count
        ↓
Check: count > limit?
    ├─ NO → Allow request ✅
    └─ YES → Return 429 Too Many Requests ❌
        ↓
Fail Closed: If Redis unavailable → 503 (don't allow through)
```

---

## Asynchronous Job Architecture (Celery)

### Beat Schedule

```
Celery Beat (TICK every minute)
    ├─ Check trigger: is_minute_5? (every 5 min)
    │   └─ Task: materialize_daily_reminders
    │       • Query user daily reminders (recurring)
    │       • For today: INSERT ReminderOccurrence
    │
    ├─ Check trigger: every minute
    │   └─ Task: fire_reminders
    │       • Query due ReminderOccurrence (past due_time)
    │       • For each: enqueue send_notification
    │       • Mark as fired
    │
    ├─ Check trigger: is_06_00? (daily at 6 AM)
    │   └─ Task: send_med_refill_alerts
    │       • Query medications expiring soon
    │       • Send email alerts to users
    │
    └─ Check trigger: is_03_00? (daily at 3 AM)
        └─ Task: purge_soft_deleted_accounts
            • Query soft-deleted users (> 30 days)
            • DELETE user row (cascade deletes all data)
```

### Task Workflow Example (Meal Photo Analysis)

```
Mobile app calls: POST /api/v1/meals/analyze-photo
    ↓ [multipart image]
Core API endpoint
    ├─ Parse image + validate JWT
    ├─ Generate job_id (UUID)
    ├─ Enqueue Celery task:
    │   celery.send_task('process_meal_image', args=[user_id, image_data])
    └─ Return { job_id, status: "processing" }
        ↓
Mobile app polls: GET /api/v1/meals/analyze-photo/{job_id}
    ├─ Redis GET {job_id}
    └─ Return { status: "processing" } (not ready yet)
        ↓ (1-2 sec later)
Celery Worker (background)
    ├─ Dequeue task
    ├─ Prepare image
    ├─ POST http://localhost:8001/analyze [image]
    ├─ AI Worker returns: { items: [...], nutrition: {...} }
    ├─ Store in PostgreSQL (Meal, MealResult, Nutrition)
    ├─ SET Redis {job_id} → { status: "complete", result: {...} }
    └─ Return
        ↓
Mobile app polls again
    ├─ Redis GET {job_id}
    └─ Return { status: "complete", result: {...} } ✅
        ↓
Mobile app displays nutrition breakdown
```

---

## Key Design Decisions

### 1. BFF Pattern for Web
**Rationale**: 
- Security: Core API never exposed to browser (eliminates CORS, credential leaks)
- Flexibility: BFF can add auth middleware, rate limiting, error normalization
- Privacy: Sensitive data (tokens, secrets) never leave backend

### 2. Direct API for Mobile
**Rationale**:
- Performance: Eliminates extra hop (mobile → BFF → Core)
- Simplicity: No cookie/session overhead
- Security: Bearer tokens in SecureStore (more secure than browser storage)

### 3. WebSocket for Real-time Chat
**Rationale**:
- Low latency: Bidirectional connection, no polling overhead
- Scalability: Redis Pub/Sub allows multi-replica broadcast
- User experience: Immediate message delivery (no 1-5 sec delay)

### 4. Celery for Background Tasks
**Rationale**:
- Async processing: Long-running tasks don't block API requests
- Reliability: Celery retries failed tasks
- Scheduling: Beat allows periodic jobs (reminder materialization, account purge)

### 5. Async-first Transaction Safety (Backend)
**Rationale**:
- Explicit commits: Write endpoints explicitly call `await db.commit()`; read endpoints do not. Prevents accidental mutations persisting on GET paths.
- Separation of concerns: FastAPI dependency injector (`get_db`) manages rollback-on-exception only; endpoints own transaction boundaries.
- Alembic compatibility: Centralized ORM model registry in `app/models/__init__.py` ensures Alembic autogenerate sees all tables without app import side-effects.

### 6. Redis for Rate Limiting (Fail Closed)
**Rationale**:
- Performance: O(1) counter increment
- TTL support: Counters auto-expire after time window
- Fail closed: If Redis down, reject requests (safer than allowing)

---

## Known Limitations & Future Improvements

| Issue | Current State | Target Fix |
|-------|---------------|-----------|
| **WebSocket presence** | In-memory only (not shared across replicas) | v2.0: Redis-backed presence |
| **Notification dispatch** | Stub (queues only, doesn't send) | v1.3: Call FCM/SendGrid |
| **JWT iss/aud validation** | Not enforced (single issuer in dev) | v1.3: Add validation |
| **MFA enforcement** | Password login bypasses MFA challenge | v1.3: Enforce challenge |
| **OAuth token refresh** | Not implemented | v2.0: Add OAuth refresh |
| **Multi-tenant support** | Single tenant (future) | v3.0: Organization support |

---

## Deployment Topology

### Development (Docker Compose)
```
Host Machine
  ├─ Docker Desktop (engine)
  │   ├─ postgres:latest (container 5432)
  │   ├─ redis:latest (container 6379)
  │   ├─ minio/minio (container 9000/9001)
  │   ├─ healthos-backend (container 8000)
  │   ├─ healthos-frontend (container 3000)
  │   ├─ healthos-ai-worker (container 8001)
  │   ├─ celery-worker (background)
  │   └─ celery-beat (scheduler)
  │
  └─ Access: http://localhost:3000 (frontend)
```

### Production (Kubernetes / Cloud)
```
Load Balancer (Cloudflare, HAProxy)
    ↓ (HTTPS)
Next.js BFF Replicas (3+ instances, port 3000)
Core API Replicas (3+ instances, port 8000)
    ├─ PostgreSQL Cluster (HA, read replicas)
    ├─ Redis Cluster (Sentinel, auto-failover)
    ├─ MinIO Cluster (erasure coding)
    ├─ Celery Worker Pool (scaling)
    └─ Celery Beat (single instance, backup standby)
```

---

## References

- [Project Overview](./project-overview-pdr.md)
- [Codebase Summary](./codebase-summary.md)
- [Security Guide](./security.md)
- [Deployment Guide](./deployment-guide.md)
- [API Compatibility Guide](./api-compatibility.md)
- [API Codegen](./api-codegen.md)
