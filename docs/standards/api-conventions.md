# API Conventions — BFF & Core BE

Status: living standard (UX master plan §B "Shared foundations")
Owners: HealthOS platform team
Applies to: every Next.js BFF route under `frontend/src/app/api/v1/**` and
every FastAPI handler under `core/app/api/v1/**`.

> Browsers must NEVER call Core BE directly. The architectural rule is:
>
> ```
> Browser → Next.js BFF (`/api/v1/**`) → Core BE (`/v1/**`)
> ```
>
> The BFF is responsible for shaping every response into the envelope below
> so the FE can consume one uniform `DataSlice<T>` shape across all surfaces.

Production Next.js config must not expose a browser-facing `/v1/:path*`
rewrite to Core. Local developer shortcuts, if ever reintroduced, must be
guarded by an explicit development-only condition and documented in the same
change. The regression test for this policy lives in
`frontend/src/__tests__/next-config-routing-policy.test.ts`.

WebSockets are the deliberate exception to the HTTP BFF rule: clients that need
Core realtime transport may open `/ws` directly against Core, but only after
obtaining a short-lived ticket from `GET /v1/auth/ws-ticket`. A public `/ws`
rewrite in Next.js is not currently configured; if one is added later, it must
preserve the same ticket expectation and must not become a bearer-token bypass.

---

## 1. Response envelope

Every JSON response (success and failure) MUST conform to:

```jsonc
{
  "status": "success" | "empty" | "empty_in_range" | "stale" | "partial"
          | "degraded" | "syncing" | "pending" | "no_permission"
          | "loading"  | "recoverable_error" | "hard_error",
  "data":   <T>      | null,    // primary payload, omitted on hard errors
  "meta":   <Meta>   | null,    // trust cues + pagination + diagnostics
  "error":  <Error>  | null     // present iff status ends in `_error` or `no_permission`
}
```

The status vocabulary is exhaustive — every consumer (`<DataState/>`, widgets,
charts) handles every status. The full list lives in
`frontend/src/types/data-slice.ts` and MUST stay in sync with the Core BE
serializer.

### 1.1 Status semantics

| status              | data      | meaning                                                                 |
| ------------------- | --------- | ----------------------------------------------------------------------- |
| `loading`           | absent    | FE-only placeholder. Servers never emit this.                            |
| `success`           | required  | Fully resolved, fresh data.                                              |
| `empty`             | optional  | Resource exists but the user has nothing in it (zero state).             |
| `empty_in_range`    | optional  | Data exists, but the requested time window is empty.                     |
| `stale`             | required  | Best-known value, older than the freshness budget for this surface.      |
| `partial`           | required  | Some sub-slices resolved, others did not. List failed keys in `meta.missing`. |
| `degraded`          | required  | All sub-slices resolved, but at reduced fidelity (e.g. cached fallback). |
| `syncing`           | optional  | Background refresh is in flight; render last known data if present.      |
| `pending`           | absent    | Long-running job accepted but not yet finished. Poll the job route.      |
| `no_permission`     | absent    | Caller lacks scope/consent. `error.code` describes which one.            |
| `recoverable_error` | absent    | Transient upstream failure. UI should offer retry.                       |
| `hard_error`        | absent    | Non-retryable failure. UI should escalate (support / change inputs).     |

### 1.2 `meta` shape

```ts
interface Meta {
  generated_at?: string;     // ISO-8601, when server materialised the response
  recorded_at?:  string;     // ISO-8601, when the underlying reading occurred
  ingested_at?:  string;     // ISO-8601, when we received it
  source?:       ProviderId; // "manual" | "apple_health" | "fitbit" | …
  confidence?:   number;     // 0..1, AI/model confidence for derived values
  page?:         number;
  per_page?:     number;
  total?:        number;
  missing?:      string[];   // sub-slice keys that failed (status: partial)
}
```

`meta.source`, `meta.recorded_at`, and `meta.confidence` directly drive
`<SourceBadge/>`, `<FreshnessChip/>`, and `<ConfidenceChip/>` respectively.
**Any handler that returns user-visible data must populate at least
`source` and `recorded_at`** — without them the FE cannot prove provenance.

### 1.3 `error` shape

```ts
interface ErrorEnvelope {
  code:    string;                       // stable machine ID, SCREAMING_SNAKE_CASE
  message: string;                       // localised human fallback
  details?: Record<string, unknown>;     // structured context (rate-limit reset, etc.)
}
```

Stable codes the FE already branches on:

- `NO_PERMISSION` — caller lacks the requested scope.
- `INSUFFICIENT_PERMISSIONS` — device/provider scope missing for sync.
- `PAYLOAD_TOO_LARGE` — body exceeded the route's `bodySizeLimit` (BFF-only).
- `UNSUPPORTED_MEDIA_TYPE` — wrong `Content-Type` for the route.
- `PROVIDER_UNAVAILABLE` — upstream device API is down.
- `JOB_NOT_FOUND` / `JOB_FAILED` — long-running task lookup outcomes.
- `RATE_LIMITED` — include `details.retry_after_s`.
- `SERVICE_UNAVAILABLE` — generic recoverable upstream failure.

---

## 2. HTTP status mapping

The envelope's `status` is the source of truth for the UI. The HTTP status
code is the source of truth for HTTP infrastructure (CDNs, retries, logs).
They are mapped, not interchangeable:

| envelope status     | HTTP status                          |
| ------------------- | ------------------------------------ |
| `success`           | 200                                  |
| `empty` / `empty_in_range` | 200                           |
| `stale` / `partial` / `degraded` / `syncing` | 200          |
| `pending`           | 202                                  |
| `no_permission`     | 403 (or 401 if unauthenticated)      |
| `recoverable_error` | 502 / 503 / 504 — pick by upstream cause |
| `hard_error`        | 4xx for caller faults, 500 for server faults |

**Rule:** never serve a 200 with `status: "hard_error"`, and never serve a
5xx with `status: "success"`. Mismatches break observability dashboards.

---

## 3. Pagination

Cursor-based pagination is preferred. When using offset pagination:

- Request:  `?page=1&per_page=20` (`per_page` capped at 100).
- Response: include `meta.page`, `meta.per_page`, `meta.total`.
- Empty page beyond the last result → `status: "empty_in_range"`, not `"empty"`.

---

## 4. Multipart uploads

The BFF proxy (`coreProxy`) supports binary uploads:

- Default JSON limit: **1 MiB** (`JSON_BODY_LIMIT`).
- Multipart limit:    **10 MiB** (`MULTIPART_BODY_LIMIT`).
- Pass `multipart: true` to opt in; the browser-supplied `Content-Type`
  (with the boundary) is preserved end-to-end.
- Oversized bodies are short-circuited with HTTP 413 +
  `error.code = "PAYLOAD_TOO_LARGE"` — the request never reaches Core BE.

Reference implementation: `frontend/src/lib/core-api-proxy.ts`.

---

## 5. Long-running jobs

Endpoints that kick off async work (e.g. `POST /v1/meals/analyze-photo`)
follow this contract:

1. Initial response: `status: "pending"`, body includes `data.job_id` and
   `data.poll_url` (relative path the FE can `GET`).
2. Polling responses cycle through `pending` → `success` | `recoverable_error`
   | `hard_error`. The FE shows a "still working on it" affordance after
   12 seconds and offers a manual fallback.
3. Server-Sent Events (`/events`) are preferred when the FE is foregrounded;
   polling is the fallback for background tabs.

---

## 6. Idempotency & write semantics

- Every mutating route accepts an optional `Idempotency-Key` header (UUID v4).
  The BFF forwards it untouched. Replays within 24h must return the original
  response envelope.
- Mutations that the FE renders optimistically (e.g. acknowledging a
  reminder) MUST be safe to retry. On failure, the FE rolls back its local
  state and surfaces the `error.message` via toast.

---

## 7. Internationalisation

- `error.message` is localised by the BFF using the request's `accept-language`
  header (or session locale, whichever is more specific).
- Stable enums (`status`, `error.code`, `meta.source`) are NEVER localised;
  the FE owns the i18n string lookup table.
- Number, date, and currency formatting is FE-side via `format-utils`.

---

## 8. Versioning

- `/v1/**` is frozen — changes must be additive.
- Breaking changes ship under `/v2/**` with a deprecation window of 90 days
  during which both routes serve identical envelopes.
- Adding a new `status` value or a new `error.code` is **not** a breaking
  change — clients fall back to the generic `<DataState/>` "unknown state"
  branch — but it MUST be documented here in the same PR.

---

## 8a. State machines (B7)

These are the canonical FSMs introduced by Batch B7. Service code rejects
illegal transitions with `error.code = 'INVALID_STATUS_TRANSITION'`
(HTTP 422). The FE filter buckets and chips are derived from these labels —
do NOT introduce parallel enums on the client.

### Appointment status

```
booked  → scheduled
booked  → upcoming
booked  → cancelled
booked  → rescheduled
scheduled → upcoming
scheduled → in_progress
scheduled → cancelled
scheduled → rescheduled
upcoming → in_progress
upcoming → completed
upcoming → no_show
upcoming → cancelled
upcoming → rescheduled
in_progress → completed
in_progress → no_show
in_progress → cancelled
completed | cancelled | no_show | rescheduled  (terminal)
```

### Reminder occurrence status

```
pending → fired   (Celery beat fired_due_occurrences claimed the row)
pending → snoozed (user explicit snooze)
pending → missed  (catch-up sweep marks past-due unfired rows)
pending → skipped (user explicit skip)
pending → done    (user explicit complete without firing)
fired   → done | skipped | snoozed
done | skipped | missed                   (terminal)
snoozed → fired                            (re-fires at the new time)
```

The per-rule `Reminder.is_active` flips to `false` automatically when a
`once` reminder's only occurrence transitions to `done` so the materializer
stops generating new slots.

### Account status (soft delete + grace + purge)

```
active            → pending_deletion   (DELETE /v1/users/me)
pending_deletion  → active             (POST /v1/users/me/restore, within grace)
pending_deletion  → purged             (Celery purge_expired_accounts daily 03:00 UTC, after purge_at)
purged                                  (terminal — row gone)
```

`get_current_user` rejects pending-deletion users with HTTP 403 and
`error.code = 'ACCOUNT_PENDING_DELETION'`. The OAuth callback path returns
the same code on `POST /v1/auth/token`; BFF callbacks redirect to
`/login?restore=pending&provider=...` so the user can sign back in via the
restore endpoint instead of bouncing through a generic OAuth error.

### Data export request status

```
pending → running → completed | failed
completed → expired                  (24h after completed_at; janitor task)
```

### Report PDF request status

Same as data export. The 5-min signed URL is minted on each download click
and never persisted.

### Message status (AI streaming)

```
pending → streaming → completed | stopped | failed
```

`stopped` is set by the streaming generator when `request.is_disconnected()`
fires (FE clicked "Stop generation"). `failed` covers exceptions (upstream
AI worker error, parse failure). Direct/group messages bypass the streaming
path and are persisted as `completed` immediately.

---

## 9. Testing checklist for new routes

- [ ] Returns the envelope shape on every code path (use `assertEnvelope` helper).
- [ ] Populates `meta.source` and `meta.recorded_at` for any user-visible data.
- [ ] Maps to the correct HTTP status (table §2).
- [ ] Has a contract test pinning the envelope schema.
- [ ] Has at least one fixture per emitted `status` value.
- [ ] Rate-limited routes include `details.retry_after_s`.
- [ ] Idempotent writes are covered by a replay test.

---

## 10. References

- `frontend/src/types/data-slice.ts` — canonical FE type.
- `frontend/src/components/ui/data-state.tsx` — UI consumer.
- `frontend/src/lib/core-api-proxy.ts` — BFF transport with limits.
- UX master plan §B "Shared foundations" — design rationale.
