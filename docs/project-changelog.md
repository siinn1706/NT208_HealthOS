# HealthOS — Project Changelog

> **Version**: 1.3.6-admin-redesign | **Last Updated**: 2026-05-29

---

## [Unreleased]

### Added

#### Medical RAG Retrieval for AI Chat (2026-05-28)
- **Knowledge store**: Added curated medical source/chunk ORM models, Alembic migration `041_medical_knowledge_rag`, lexical search index, and portable 384-dimension embedding storage.
- **Curated corpus**: Added six concise WHO/CDC/MedlinePlus source summaries with deterministic manifest-driven chunking and `python -m app.scripts.seed_medical_knowledge` ingestion.
- **Retrieval service**: Backend AI chat now retrieves source snippets only for non-emergency health questions, skips non-health messages, and degrades to limited-source chat context when retrieval is unavailable.
- **Worker citations**: AI Worker chat accepts `rag_context` and `safety_context`, formats source snippets as `[S1]` labels only when sources exist, and treats RAG text as untrusted evidence.
- **Regression coverage**: Added focused corpus, retrieval, orchestrator, model-registry, and worker prompt tests.
- **Verification**: Python syntax compile, corpus JSON validation, migration compile, and `git diff --check` passed. Targeted backend/worker pytest is blocked by the local broken Windows Python/venv.

#### AI Worker JSON + Embeddings (2026-05-28)
- **DeepSeek controls**: AI Worker proxy payloads now support `thinking`, `reasoning_effort`, `response_format`, and safe provider-specific extension fields.
- **JSON helper**: Added JSON-mode completion helper with a narrow retry path when a local proxy rejects `response_format`.
- **Embedding endpoint**: Added internal `POST /api/ai/embed` returning local 384-dimensional multilingual embeddings for future Medical RAG; no backend retrieval/vector store added.
- **Env/docs/tests**: Worker env templates expose the new DeepSeek and embedding knobs; tests cover payloads, JSON fallback, streaming reasoning suppression, embedding service, and endpoint validation.

### Fixed

#### Meal Photo Analyze Contract (2026-05-29)
- **Severity/impact**: Medium user-facing bug where web meal photo analysis returned `422` before queueing because Core required a pre-analysis `name` field that the camera flow does not know yet.
- **Analyze-photo fallback**: Core `/v1/meals/analyze-photo` now accepts image-only multipart uploads and stores a neutral `Photo meal` placeholder until YOLO analysis resolves the nutrition result.
- **Model/config placement**: Verified the local YOLOv10 model hash, mirrored it into the Docker/README `services/ai-worker/models/` path, and aligned AI worker env paths with `models/` plus `data/class_names.py`.
- **Worker dependency**: Added the `dill` runtime dependency required by the YOLOv10 checkpoint.
- **Verification**: Focused backend meal endpoint pytest, AI worker env render check, worker model/class path probe, and direct YOLO checkpoint load passed.

#### AI Chat Streaming RAG and Personal Context (2026-05-29)
- **Severity/impact**: High AI-quality bug where web AI chat SSE replies skipped Medical RAG and user health context even though the non-streaming path had them.
- **Streaming payload**: SSE worker calls now reuse the backend AI chat payload builder, including DB-backed `user_context`, Medical RAG `rag_context`, `safety_context`, locale override, and reply token budget.
- **Runtime proof**: SSE finalization now persists `messages.ai_metadata` with model, token usage, latency, streamed flag, RAG state, and source id/title/url/score evidence.
- **Corpus activation**: Added `backend/ingest_medical_knowledge.py` and used it to ingest the local corpus into the current DB: 6 sources, 18 chunks, 18 embeddings.
- **Vietnamese RAG detection**: BMI/weight Vietnamese prompts such as "Cân nặng này có ổn không?" now route through the health/RAG path.
- **Frontend preservation**: Chat message adaptation now keeps returned `ai_metadata` after reload/refetch for operator inspection.
- **Safety preserved**: Emergency prompts still bypass DB/RAG/worker streaming and persist the deterministic safe system reply.
- **Verification**: Backend focused pytest passed: 32 tests. Frontend targeted Vitest passed: 14 tests. Python compile, RAG DB query, direct AI Worker stream probe, and `git diff --check` passed. Full frontend `tsc --noEmit` remains blocked by unrelated baseline admin/test/config type errors.

#### AI Chat Reload Metadata and Banner State (2026-05-29)
- **Severity/impact**: Medium user-facing bug where reloaded AI answers lost AI rendering, exposed raw markdown markers, and could show `(Đã chỉnh sửa)`.
- **AI stream identity**: SSE assistant placeholders now persist with the AI bot sender id and stream finalization no longer marks generated text as a user edit.
- **Chat banner**: AI SSE conversations no longer enable the per-conversation websocket reconnect banner; offline/session banners remain available where relevant.
- **Verification**: Frontend targeted Vitest passed: 21 tests. Backend stream-contract pytest passed: 5 tests. Targeted frontend ESLint, backend `py_compile`, and `git diff --check` passed.

#### AI Chat Locale Consistency (2026-05-29)
- **Severity/impact**: Medium user-facing bug where Vietnamese chat sessions could receive English-only AI replies when saved backend preferences were `en`.
- **Locale contract**: AI stream sends now include the active chat UI locale, and Core prefers that request locale before falling back to saved profile/preferences.
- **Prompt guard**: AI Worker language instruction now overrides prior assistant history and untrusted context, preventing "switch languages" replies from stale English context.
- **Verification**: Backend AI stream/orchestrator pytest passed: 21 tests. AI Worker proxy pytest passed: 17 tests. Frontend AI streaming Vitest passed: 6 tests. Core OpenAPI drift check passed. Python syntax compile, targeted frontend ESLint, and touched-file diff check passed.

#### Dashboard Summary Same-Origin Fetch (2026-05-29)
- **KPI load fix**: Dashboard summary, vitals, and reminders server helpers now resolve the BFF URL from current request host/proto in local/dev instead of stale `NEXT_PUBLIC_APP_URL`, avoiding same-app fetch failures that surfaced as KPI summary load errors.
- **Protected env guard**: Staging/production keeps using configured `NEXT_PUBLIC_APP_URL`.
- **Verification**: Focused dashboard/BFF Vitest passed: 30 tests. Targeted ESLint passed. Full frontend TypeScript remains blocked by unrelated admin/test/config baseline errors.

#### AI Chat Stream Locale Crash (2026-05-29)
- **Stream locale**: Core `/v1/conversations/{id}/messages/stream` now resolves chat locale from `user_preferences.locale` with a safe `vi` fallback instead of reading removed `UserProfile.preferred_language`, preventing 500s after user message persistence.
- **Forbidden mapping**: Non-member AI stream sends now return `403 CHAT_FORBIDDEN` instead of surfacing uncaught membership `ValueError`.
- **Verification**: Backend targeted pytest passed: 23 tests. Live Core disposable stream probe returned 200 and emitted `event: start`; live BFF disposable stream probe completed through `event: done` with deltas. Probe rows were cleaned up.

#### Production Guardrails and Contract Observability (2026-05-29)
- **WS fanout observability**: Chat conversation-member fanout failures now emit structured warning logs and a low-cardinality Prometheus counter from checked manager delivery failures while preserving post-commit best-effort delivery.
- **Contract drift gate**: Removed broad device/wearable/sync route skips from BFF/mobile contract mapping; Google Health wearable Core/BFF paths are now declared, with only exact dated allowlist entries for pre-existing admin/chat/OpenAPI drift.
- **Protected frontend env**: Staging/production config now fails fast for empty or malformed `BFF_TRUSTED_ORIGINS`, forbids CSRF dry-run/dev bypass variables, and validates production cookie TTL alignment during env rendering.
- **Dev bypass safety**: `DEV_BYPASS_CREDENTIALS` is ignored unless `DEV_BYPASS_ENABLED=true` and the app is in an unprotected env.
- **OAuth accuracy**: Google sign-in callback now names the `id_token` handling as unverified nonce-only decoding; link callback wording no longer implies nonce verification.
- **Verification**: Backend targeted pytest passed: 12 tests. Frontend targeted Vitest passed: 38 tests. Env renderer tests passed: 16 tests.

#### BFF Frontend Runtime Consistency (2026-05-29)
- **Client parsing**: `bffFetchClient` now handles 204/205, empty bodies, text bodies, and empty/text error responses without JSON parse crashes while preserving 401 redirect behavior.
- **SSE auth refresh**: Chat SSE BFF streaming now refreshes expired or missing access cookies before opening the upstream stream, retries once, keeps inbound abort cancellation, and preserves rotated auth cookies.
- **Legacy health-data routes**: Deprecated `GET /api/v1/health-data` with 410 replacement guidance; legacy meal create paths now use shared `coreProxy` with idempotency and multipart boundary handling.
- **Dashboard failure truthfulness**: Dashboard summary and vitals helpers now return `DataSlice` recoverable errors so widgets show load failures instead of silent empty/default data.
- **Verification**: Focused frontend Vitest passed: 49 tests across BFF/client/dashboard/chat-vitals seams. Full frontend Vitest passed: 912 tests. Touched-file ESLint and i18n parity passed. Production build still compiles the app bundle, then TypeScript remains blocked by unrelated `admin-validation.ts` Zod 4 type drift.

#### Backend Meal Auth OTP Correctness (2026-05-29)
- **Meal photo state**: Image meal create and analyze-photo now persist `processing` with the queued job id; enqueue failure returns a controlled server error instead of committing a pending jobless row.
- **Nutrition sanitizer**: AI meal analysis now preserves valid ingredient breakdowns while dropping invalid nested entries.
- **Reset password OTP**: Verified reset markers survive breached-password and user-state validation failures, then consume atomically only before password/token mutation.
- **Delete-account OTP**: `delete_account` verify now creates a one-time marker consumed by OAuth-only account deletion; request/verify schemas, OpenAPI, mobile types, and BFF verify proxy aligned.
- **Verification**: Backend focused pytest passed: 24 tests. Frontend verify-OTP route Vitest passed: 1 test. Backend `compileall`, mobile typecheck, and scoped diff check passed. Contract drift gate remains blocked by unrelated admin/chat/subscription route drift and password-breach shape mismatch.

#### Dashboard Performance Verification (2026-05-29)
- **SSR guard**: Added a static regression test proving `/dashboard` keeps exercise suggestions out of the server render critical path.
- **Widget regression coverage**: Exercise suggestions now have loading, success, error, and empty-state tests; trend/anomaly widgets assert batch route usage and no dashboard single-trend fan-out.
- **Diagnostics**: Added opt-in BFF Core proxy timing logs for dashboard/trend paths via `BFF_DASHBOARD_PERF_LOG=true` and debug-only Core endpoint duration logs.
- **Backend coverage**: Tightened batch trend response-key assertions and added non-blocking `last_seen_at` scheduling coverage.
- **Verification**: Focused frontend Vitest passed: 18 tests. Focused backend pytest passed: 21 tests. Targeted frontend ESLint and backend `py_compile` passed. Full frontend lint/test still have unrelated baseline failures.

#### Web Vitals Realtime Refresh (2026-05-29)
- **Realtime hook**: Added a PHI-safe `vitals.updated` refetch hook over the existing dashboard websocket bridge and removed the stale pushed-chart-data hook.
- **Health dashboard**: `/dashboard/health` now refreshes current-period KPI, comparison, and connected-device data from BFF `/api/v1/**` routes on vitals events and reconnect.
- **Main dashboard widget**: `VitalsChartWidget` now refetches extended vitals on the same event/reconnect path and clears stale chart data when the canonical response is empty.
- **Health Connect deletions**: Ingest publish count now includes deleted rows, so deletion-only syncs can still trigger a frontend refresh.
- **Race guards**: Current-period request guards prevent slow older range fetches from overwriting newer selections.
- **Verification**: Focused Vitest, touched-file ESLint, focused backend pytest, and code review passed. Full frontend lint/test and broader backend endpoint pytest still have unrelated baseline/environment failures.

#### Dashboard Trends Batch Endpoint (2026-05-29)
- **Core batch route**: Added authenticated `GET /v1/reports/trends/batch` with metric parsing that trims, lowercases, dedupes, preserves order, omits unsupported tokens, and returns `400` when no supported metric remains.
- **Service preload**: Trend batch analysis now loads health metrics once per user/period and loads meals only when `calories` is requested, while keeping the single `/reports/trends` fallback behavior unchanged.
- **BFF/dashboard**: Added `/api/v1/reports/trends/batch` and switched trend summary + realtime anomaly widgets from per-metric fan-out to one batch request per load/period.
- **Frontend cleanup**: Extracted a client-safe trend batch helper with auth-scoped in-flight dedupe, safe empty fallback, and stale-period protection for fast trend range switching.
- **Contracts/tests**: Updated Core/BFF contract paths, aligned required `metrics` query metadata, and added focused service, API, and widget regression coverage.
- **Verification**: Backend trend service/API pytest passed: 13 tests. Frontend batch widget Vitest now passes 6 tests; targeted ESLint, backend syntax compile, and changed-file diff check passed. Repo-wide frontend TypeScript remains blocked by unrelated admin/BFF/config baseline errors.

#### Dashboard Auth DB WS-Token Overhead Reduction (2026-05-29)
- **Auth last-seen**: `get_current_user` now schedules throttled background `last_seen_at` touches after all auth/security checks instead of awaiting a DB update on every authenticated request.
- **DB pooling**: Async DB pooling now stays enabled under `DEBUG=true`; `DB_DISABLE_POOL=true` is the explicit opt-in for `NullPool` and is rendered from the master env template.
- **Env migration safety**: Existing local master env files that lack `DB_DISABLE_POOL` now render it as `false` instead of failing, while other missing required keys still fail.
- **WS token limiter**: Cookie-bearing `/api/v1/auth/ws-token` calls keep a stable pre-Core abuse gate, then authenticated calls rate-limit by `session:<sha256(access-token)>` without exposing raw tokens.
- **Regression coverage**: Added backend scheduling/pool-option tests, env-renderer coverage, and ws-token route tests for hashed principals, invalid-cookie abuse gating, unauth 401, 429, upstream error, and 503 paths.
- **Verification**: Focused backend pytest passed: 10 tests. Focused frontend Vitest passed: 78 tests. Env renderer tests passed: 10 tests. Backend env render/check passed.

#### Dashboard Exercise AI Timeout Fallback (2026-05-29)
- **Core guardrail**: Dashboard exercise suggestions now bound the AI worker call with a short service-level timeout before falling back to the existing rule-based engine.
- **Fallback safety**: Timeout, AI worker errors, empty AI output, and unavailable worker paths return rule suggestions without caching failed output.
- **Locale cache**: Exercise suggestion cache keys now include locale and successful non-empty AI suggestions still use the one-hour Redis cache.
- **Regression coverage**: Added focused backend service tests for cache hit, AI success cache write, timeout fallback, empty output fallback, AI error fallback, parse-skip fallback, and blank-locale normalization.
- **Verification**: Targeted backend pytest passed: 10 tests. Python syntax compile and `git diff --check` passed with only existing LF/CRLF warnings.

#### Dashboard Exercise Suggestions SSR Decoupling (2026-05-29)
- **Dashboard SSR**: Removed exercise suggestions from `/dashboard` server `Promise.all`; summary, vitals, and reminders remain server-rendered.
- **Client widget fetch**: Exercise suggestions now load after hydration through `/api/v1/dashboard/exercise-suggestions` with loading, empty, and safe error states.
- **Regression coverage**: Added focused widget tests for BFF fetch and request failure containment; i18n keys added for loading/error copy.
- **Verification**: Static SSR grep, targeted widget Vitest, targeted ESLint, and i18n parity passed. Repo-wide TypeScript still has unrelated baseline admin/BFF/config errors.

#### AI Chat Medical Safety Layer (2026-05-28)
- **Emergency bypass**: Backend AI chat now detects deterministic emergency red flags before AI Worker calls and persists a templated emergency reply instead of sending emergency content to the LLM.
- **Active chat paths**: WebSocket AI replies and the REST/SSE stream endpoint both use the safety layer; emergency handling bypasses AI worker rate/concurrency rejection while non-emergency worker flow stays unchanged.
- **Prompt safety**: Vietnamese and English system prompts now state the AI is not a doctor, must not diagnose/prescribe/change medication doses, should ask for missing data, explain uncertainty, and include seek-care guidance.
- **Verification**: Python syntax compile passed; pure medical-safety and stream-contract tests passed. Full backend targeted pytest remains blocked by the local broken Windows Python/venv.

#### AI Chat Response Depth (2026-05-28)
- **Answer depth**: Core and AI Worker chat prompts no longer force terse/concise replies; they now ask for complete, structured answers with rationale summary, practical next steps, and medical-safety caveats.
- **Completion budget**: Default `AI_CHAT_MAX_TOKENS` increased from `1024` to `2048` across worker config and env templates; Core chat also sends a 2048-token reply budget to override stale worker env values.
- **Regression coverage**: Added prompt/payload assertions so the proxy request keeps the larger token budget and detailed-answer instruction.

#### AI Proxy Provider Migration (2026-05-28)
- **AI Worker text provider**: Chat, streaming chat, exercise suggestions, and report summaries now use the local OpenAI-compatible proxy at `AI_PROXY_BASE_URL` with default model `oc/deepseek-v4-flash-free`.
- **Browser SSE path**: Core `/v1/conversations/{id}/messages/stream` now forwards to AI Worker `/api/ai/chat/stream` instead of the old stub stream path.
- **Gemini dependency removed**: AI Worker runtime no longer requires `GEMINI_API_KEY`; env templates/rendering emit provider-neutral `AI_PROXY_*` keys for AI Worker only.
- **Meal scan honesty**: Meal photo analysis is local YOLO-only; model/class misses now return controlled failure instead of a third-party vision fallback.
- **Timeout behavior**: YOLO inference timeout now returns without waiting on executor shutdown.
- **Fallback copy**: Backend chat fallback wording no longer tells users/admins to configure an API key.

#### Manual Meal Persistence Contract (2026-05-28)
- **Core commit**: `POST /v1/meals` now commits JSON/manual and multipart create paths before returning/storing the success envelope.
- **Manual nutrition**: Web manual payload fields (`meal_type`, `notes`, ingredients, calories/macros) are normalized into `Meal.nutrition_result`; `/ingredients` reads submitted rows back from that JSON.
- **BFF idempotency**: `/api/v1/meals` and legacy `/api/v1/health-data/meal` forward `Idempotency-Key` for creates so offline/browser retries reach Core's replay guard.
- **Regression coverage**: Added Core create tests for fresh-session persistence, nutrition payload, idempotency replay, invalid ingredient values, and photo create job id; added BFF JSON/multipart forwarding tests.
- **Verification**: Python syntax compile passed; frontend targeted Vitest and ESLint passed. Backend pytest is blocked by the local broken Windows Python/venv.

#### Chat Realtime Read/Unread + Notifications (2026-05-28)
- **Read cursor**: Active dashboard chats now mark the visible last message read through the BFF, including direct URL entry and active incoming messages, with a duplicate-call guard.
- **Realtime badges**: Dashboard shell listens on the existing global `/ws` ticket socket and dispatches local refresh events for chat unread counts and notifications while preserving polling fallback.
- **Presence + typing**: `user.status` updates loaded conversation participants without reload; typing footer scrolls into view only when the viewer is already at bottom.
- **Notifications**: In-app notification persistence now emits `notification.created` to the owner user socket after successful persistence paths; the popover refreshes unread/list data immediately.
- **Compatibility**: Frontend accepts both `conversation.updated` and `chat.conversation.updated` during the backend event-name transition.

#### Chat Session ID Contract (2026-05-28)
- **BFF session normalization**: `/api/v1/auth/session` now maps Core `/v1/auth/me` `data.id` into `data.user_id`, so dashboard chat keeps `currentUserId` after reload/session bootstrap and does not disable the composer.
- **Regression coverage**: Added a session snapshot test for the Core `/auth/me` response shape and stabilized the permission-cap test that was timing out under Vitest.

#### Web Chat Dev Tunnel Bootstrap (2026-05-27)
- **Chat composer**: Dashboard chat now seeds `currentUserId` from server-validated BFF session before client hydration; transient `/api/v1/auth/session` fetch failures no longer clear the known id and leave the textarea disabled.
- **Cloudflared HMR**: Frontend dev proxy normalizes Next-owned websocket upgrade `Host` and `Origin` to the local dev origin while keeping Core websocket proxying limited to `/ws` and `/v1/**` upgrades.
- **Tests**: Added static guards for chat session bootstrap and tunnel-safe dev-proxy routing.

#### Offline Messaging — Store-and-Forward contract hardened (2026-05-27)
- **Audit**: Verified persist-before-broadcast invariant at all 3 send entrypoints (REST, WS, AI stream); no P1 gaps found
- **Backend hardening**: `client_message_id` idempotency is backed by a partial unique index; reply/read cursors are scoped to the active conversation; AI stream now persists through the same message service path
- **Backend tests** (`backend/tests/test_chat_offline_store_and_forward.py`): 7 integration tests covering offline-recipient catch-up via REST, unread_count accuracy, `client_message_id` idempotency, reply/read cursor scoping, cursor pagination across page boundaries
- **Frontend tests** (`frontend/src/hooks/__tests__/useOutboundQueue.test.ts`): FIFO drain, success/failure re-enqueue, attempts counter, re-entrant guard, per-user IDB isolation, unavailable-IDB failure, 200-cap eviction
- **Frontend tests** (`frontend/src/hooks/__tests__/useChat.sendMessage.offline.test.ts`): network vs rate-limit error code classification, `onNetworkFailure` call semantics, duplicate WS frame dedup, conversation-switch merge isolation, delayed-send switch race
- **Frontend hardening**: queued bubbles are shown only after IndexedDB persistence succeeds; all logout purge paths reset chat outbox scope; stale REST refreshes preserve only active-conversation local messages
- **Docs** (`docs/system-architecture.md`): Added "Chat — Store-and-Forward Contract" section with send-path table, catch-up-path table, idempotency contract, outbox semantics, Mermaid sequence diagram


- **Group management REST API** (6 endpoints): PATCH `/conversations/{id}`, POST `/conversations/{id}/members`, DELETE `/conversations/{id}/members/{user_id}`, POST `/conversations/{id}/leave`, POST `/conversations/{id}/members/{user_id}/role`, POST `/conversations/{id}/transfer-owner`
- **Group RBAC**: owner > admin > member; owner leave auto-promotes; last-member leave soft-deletes via `Conversation.deleted_at`
- **Backend offline catch-up**: Per-user WebSocket delivery via `_notify_conversation_members()` is best-effort; offline members have no socket, so their messages remain durable in DB and arrive through REST catch-up on reconnect/open. Uses `asyncio.gather()` with try/except isolation (fanout failure never rolls back DB).
- **Frontend BFF routes**: 6 new Next.js route handlers under `frontend/src/app/api/v1/conversations/` for group management
- **Frontend UI components**: `CreateGroupDialog`, `UserPickerMulti`, `AddMembersDialog`, `GroupMembersSection`; `ConversationList` button replaced with DropdownMenu; `ConversationInfoPanel` extended with group actions (leave, add members, remove/promote/demote/transfer)
- **Frontend hooks**: `useConversations` extended with `createGroup`, `addGroupMembers`, `removeGroupMember`, `leaveGroup`, `setMemberRole`, `transferOwnership`, `updateGroupMetadata`, `refetchConversations`
- **Offline resilience**: Queue hint below `MessageInput` when offline; `ChatLayout` refetches conversations on reconnect
- **i18n**: `chat.group.*` keys added to `en.json` + `vi.json`
- **Files new/modified**: Backend `app/services/conversations.py` (group CRUD + RBAC), `app/api/v1/endpoints/conversations.py` (6 REST endpoints + `_notify_conversation_members`), `app/ws/chat_router.py` (offline queue); Frontend `src/app/api/v1/conversations/*` (BFF routes), `src/components/dashboard/chat/` (4 new components + updated ConversationList/ConversationInfoPanel), `src/hooks/useChat.ts`, `messages/{en,vi}.json`
- **Status**: Group creation, member management, offline delivery, RBAC enforcement, i18n complete.

#### Admin User Detail Redesign + i18n + Subscription Controls (2026-05-25)
- **Phase 1 — Admin i18n foundation**: Moved all admin console UI strings from hardcoded English to next-intl with `admin.*` namespace; 60+ keys added to `en.json` + `vi.json` (userDetail, users, common, errors, subscriptions sections)
- **Phase 2 — User detail UI redesign**: Sticky action bar (Ban/Unban), collapsible rail toggle, tab system (Profile / Subscription / Activity); new components `UserDetailActionBar.tsx`, `CurrentSubscriptionCard.tsx`
- **Phase 3 — Subscription admin controls**: Quick-action buttons (Cancel, Extend +30d, +90d, Reset to Free), assignment form with Zod validation, subscription history table (BFF stub returns `[]` with TODO), `subscription-quick-action-payloads.ts` with D2/D3 decision payload builders
- **Phase 4 — localStorage refactor**: UI preference helpers extracted to `src/lib/admin/ui-prefs.ts` (density, sidebar collapse, column visibility) to keep `components/admin/` storage-free
- **Phase 5 — Tests + i18n wiring**: Rewrote `ProfileSection.test.tsx`, fixed `AdminErrorState.test.tsx` assertion, fixed `admin-bff-auth.test.ts` mock response; wired i18n into 6 admin pages; net: 32 failed → 4 failed (pre-existing in unmodified files)
- **Decision D1 (Method mismatch)**: BFF route switched to PATCH to match Core endpoint `PATCH /v1/admin/users/{id}/subscription`
- **Decision D2 (Cancel semantics)**: Cancel preserves `current.expires_at`; only flips `status` to `"canceled"`
- **Decision D3 (Extend on null/canceled)**: Base = `now`, result = `now + N days`, force `status` → `"active"`
- **Decision D4 (History persistence)**: Phase 03 ships BFF stub `[]`; new BE table `subscription_assignments` deferred to follow-up
- **Files new/modified**: `frontend/messages/{en,vi}.json` (admin keys), `frontend/src/components/admin/user-detail/*`, `frontend/src/lib/admin/ui-prefs.ts`, `frontend/src/lib/admin/subscription-quick-action-payloads.ts`, BFF `/api/v1/admin/users/[id]/subscription`
- **Status**: All 5 phases complete. Admin console fully i18n'd; user detail polish shipped; subscription controls wired.

#### Admin Console Redesign (2026-05-25)
- **Phase 1 — Design System**: 9 CSS custom properties (`--admin-*`) for sidebar, header, density, dark-mode variants
- **Phase 2 — Shell Components**: `AdminSidebar.tsx` (collapsible, token-driven, active link tracking), `AdminTopBar.tsx` (header + identity menu), `AdminShell.tsx` (wrapper), `admin-sidebar-collapse.ts` (localStorage persistence)
- **Phase 3 — Overview Page**: `KpiCard.tsx` + `Sparkline.tsx` (7-point SVG sparkline), `OverviewCards.tsx` grid, `ActivityFeed.tsx` + `ActivityFeedEntry.tsx`
- **Phase 4 — Users Table**: `UsersTable.tsx` (density toggle, column visibility, search), `ColumnVisibilityMenu.tsx`, `DensityToggle.tsx`
- **Phase 5 — User Detail**: `user-detail-action-bar.tsx`, `user-detail-profile-section.tsx`, `user-detail-subscription-section.tsx`, `user-audit-tab.tsx` (filters audit events by user)
- **Phase 6 — Subscriptions**: `PlansTable.tsx`, `PlanMetricsStrip.tsx`, `PlanBadge.tsx`, `EditPlanModal.tsx`
- **Phase 7 — Audit & Security**: `audit-table.tsx`, `audit-filter-bar.tsx`, `security-feed.tsx`, `severity-pill.tsx`, `SeverityBadge.tsx`
- **Phase 8 — Layout Primitives**: `AdminPageContent`, `AdminPageHeader`, `AdminCard`, `AdminToolbar` in `admin-layout-primitives.tsx`; all 3 admin pages migrated
- **Phase 9 — A11y & Motion**: `motion-safe:` prefix on transitions/animations; `scope="col"` on table headers; `aria-current="page"` on active nav links
- **Phase 10 — Tests**: 9 new test files (150 tests total, 150 passing); fixed `APP_ENV` mock in AdminShell/AdminSidebar tests; fixed `renderWithReason` async act() for React 18; added `testTimeout: 20000` + `maxForks: 4` to vitest config; Playwright smoke spec `e2e/admin-redesign.spec.ts` (gated by `ADMIN_E2E=1`)
- **Files new/modified**: `frontend/src/components/admin/*`, `frontend/src/lib/admin/*`, `frontend/src/app/[locale]/(admin)/*`, `frontend/src/__tests__/admin-*.test.ts`, `e2e/admin-redesign.spec.ts`
- **Status**: All 10 phases complete. UI/UX layer finished; backend RBAC endpoint wiring deferred to v1.3.

#### RBAC Foundation (2026-05-24)
- **Migration `036_rbac_foundation`**: adds `roles`, `permissions`, `user_roles`, `role_permissions` tables. `user_roles.user_id` FK is `RESTRICT` (admin role survives soft-delete; must be explicitly revoked). Extends `audit_event_type_enum` with `rbac_role_granted` / `rbac_role_revoked`.
- **`app/models/rbac.py`**: ORM models for all four tables. `User.roles` relationship uses `lazy="raise"` — all reads go through the service.
- **`app/services/rbac.py`**: `list_user_roles`, `list_user_permissions`, `has_role`, `has_permission` (all filter `User.deleted_at IS NULL`), `ensure_default_roles_and_permissions`, `grant_role`, `revoke_role`. All inserts use `ON CONFLICT DO NOTHING`. `grant_role` writes an `audit_log` row only for actual new grants (via `RETURNING`).
- **`app/core/rbac_deps.py`**: `require_role(code)`, `require_permission(code)` factory deps raising `ForbiddenException` (code `FORBIDDEN`); `get_current_user_roles`, `get_current_user_permissions`, `is_admin_user`.
- **`seed_admin.py`** refactor: accepts `SEED_ADMIN_EMAIL` (single) and `SEED_ADMIN_EMAILS` (comma-separated); emails normalized to lowercase + deduped; `_username_from_email_safe` handles reserved names (`admin` → `admin_seed`) and SHA-1 suffix on collision; grants `admin` role via RBAC; single-commit transaction; never prints password.
- **`delete_seed_admin.py`** update: no-flag → usage + exit non-zero; `--confirm` → legacy user-delete (unchanged contract); `--revoke-role` → role-only revoke + `audit_log`.
- **Tests**: `tests/services/test_rbac.py`, `tests/api/v1/test_rbac_dependencies.py`, `tests/test_seed_admin_idempotent.py`, `tests/test_delete_seed_admin_semantics.py`. All use real Postgres; skipped when `settings.database_url` absent.

**Error contract:** 403 returns `{"detail": {"code": "FORBIDDEN", "message": "Insufficient privileges."}}` — reuses existing `ForbiddenException`.

**Non-goal:** `/admin/*` endpoint wiring is deferred to a follow-up plan.

#### BFF CSRF Origin Guard & Route Protection Hardening (2026-05-24)
- **CSRF origin guard primitive** (`frontend/src/lib/bff-origin-guard.ts`): `assertSameOrigin()` validates Origin/Referer headers on all BFF mutating routes (POST/PUT/PATCH/DELETE). Wired into `coreProxy()`, `coreFetchStream()`, and 15 direct-fetch route handlers.
- **Origin validation**: Compares host:port against `BFF_TRUSTED_ORIGINS` env (comma-separated). Non-production: implicit localhost:* and 127.0.0.1:* allowed. Production: fail-closed on empty config.
- **Guard mode**: `BFF_CSRF_GUARD_MODE` env controls `dry-run` (log, forward) or `enforce` (reject with 403). Default enforce in production.
- **Route protection audit** (`frontend/src/__tests__/proxy-protected-routes.fixture.ts`): Regression test enumerates all 42 app pages, classifies 29 as private (/dashboard), 13 as public. CI fails if new page added without classification.
- **Protected routes** (`PROTECTED_PREFIXES`): /dashboard (authenticated app), /onboarding (session required). Public routes: /, /login, /register, /verify, /forgot-password, /about, /articles, /plans, /services, /legal/*, /e/[token], OAuth callbacks.
- **Deprecated endpoint deprecation** (`POST /v1/auth/check-password-breach`): Removed BFF passthrough route `frontend/src/app/api/v1/auth/check-password-breach/route.ts`. Backend now returns HTTP 410 Gone, directing clients to `GET /v1/auth/check-password-breach/range/{prefix}` (HIBP k-anonymity). Rate-limit key `auth:pwned_range_post_legacy` removed.
- **Error normalization**: `defaultCodeForStatus()` handles 410 → "ENDPOINT_GONE" code.
- **Configuration**: New env vars `BFF_TRUSTED_ORIGINS` and `BFF_CSRF_GUARD_MODE` documented in `frontend/.env.example`.
- **Test coverage**: AST tests verify mutating handlers have guards (`mutating-handlers-have-guard.test.ts`), OAuth init routes remain GET-only (`init-routes-get-only.test.ts`), route protection fixtures classify all pages (`proxy-protected-routes.test.ts`).
- **Files modified**: `frontend/src/lib/bff-origin-guard.ts` (new), `frontend/src/lib/core-api-proxy.ts`, 10+ BFF route handlers, `frontend/.env.example` (new), `backend/app/api/v1/endpoints/auth.py`, `backend/contracts/openapi/core-api.yaml`, `docs/system-architecture.md`.

#### Final Demo Readiness (2026-05-23)
- **BFF routing policy guard**: Added a frontend test preventing production `/v1/:path*` and `/ws` Next.js rewrites to Core. Documented WebSocket ticket expectations as the realtime exception.
- **Admin maintenance scripts**: `seed_admin.py` now reads `SEED_ADMIN_*` env vars and refuses missing passwords; `delete_seed_admin.py --confirm` removes the configured account.
- **Notification dispatch demo path**: Core notification dispatch persists `in_app` notifications; standalone notification service validates dispatch payloads, supports optional SMTP email, and returns explicit `skipped` reasons for unsupported/unconfigured channels.
- **Demo documentation**: Added `docs/current-status.md`, `docs/demo/demo-checklist.md`, and `docs/demo/demo-script.md`.

#### AI Worker SSRF & DoS Hardening (2026-05-24)
- **SSRF protection**: Image URL scheme allowlist (http/https only), host allowlist enforcement with case-insensitive matching, private/loopback/link-local/metadata IP blocking (169.254.169.254, CGNAT 100.64.0.0/10).
- **Redirect validation**: Manual per-hop re-validation (cap 3 redirects) mitigates DNS rebinding attacks.
- **DoS protection**: Streamed byte-cap download (10 MiB default, matches backend meal upload cap), PIL `DecompressionBombError` caught, decoded dimension validation against `MAX_IMAGE_PIXELS` (24 MP).
- **Configuration**: 5 new Settings fields in `services/ai-worker/app/core/config.py` with sensible defaults; `.env.example` documents each knob for dev/prod tightening.
- **Error sanitization**: No URLs or secrets leaked in `ImageLoadError` messages (full URLs logged at DEBUG only).
- **Test coverage**: 14 new security tests + existing suite verified; 16 total tests in `test_image_loader_security.py`.
- **Files modified**: `services/ai-worker/app/services/image_loader.py`, `services/ai-worker/app/core/config.py`, `services/ai-worker/.env.example`, `services/ai-worker/tests/test_image_loader_security.py`.

#### Documentation Audit & Hardening (2026-05-23)
- **Documentation sync pass**: Verified stale claims in security.md, system-architecture.md, project-roadmap.md, project-changelog.md against current codebase state
- **JWT iss/aud claim correction**: Updated security.md to reflect that JWT `iss`/`aud` validation is already enforced via `decode_access_token()` (not a TODO). Updated roadmap to mark as completed.
- **Meal analysis documentation**: Updated system-architecture.md to clarify meal analysis task source: `backend/app/tasks/meal_analysis.py` (Celery-based, runs in Core BE, not queue-worker service)
- **Queue worker tasks cleanup**: Documented that meal_tasks.py and notification_tasks.py were deleted from queue-worker service; meal and notification tasks now live in backend/app/tasks/
- **Verified implemented endpoints**: Confirmed `/v1/plans` endpoint exists (endpoints/plans.py); confirmed `/v1/users/me/onboarding-draft` endpoint exists (endpoints/users.py)
- **MFA enforcement status**: Password login now returns an MFA challenge when `mfa_enabled=true`; stale MFA-gap docs were corrected during the final demo readiness pass.

#### DB Session Transaction Safety & Alembic Model Registry (2026-05-22)
- **Transaction safety refactor**: Removed implicit `await session.commit()` from `get_db()` and `get_db_context()` dependency injectors. Write paths now explicitly commit; read paths do not. Rollback-on-exception preserved.
- **Model registry consolidation**: Created `backend/app/models/__init__.py` as single source of truth for ORM registration. `alembic/env.py` now imports `app.models` package, ensuring Alembic autogenerate sees all tables (audit, emergency, health_goal, etc.) without FastAPI app import side-effects.
- **Missing commit audit**: Identified and fixed 11 conversation handlers in `api/v1/endpoints/conversations.py` that relied on implicit commit. All handlers now explicitly call `await db.commit()` on success path.
- **Safety tests**: Added `tests/api/v1/test_get_db_transaction_safety.py` (test read endpoint doesn't persist mutations; write endpoint persists through new transaction shape) + `tests/startup/test_model_registry.py` (metadata includes all non-device ORM tables). 354 backend tests pass. No device sync semantics changed.

#### BFF Auth Rate-Limit Security Hardening (2026-05-22)
- **AST-based debug fetch guard** (`frontend/src/app/api/v1/auth/__tests__/no-debug-fetch-guard.test.ts`) — TypeScript compiler walks all auth route.ts files, blocks localhost/debug fetch calls at compile-time via allow-list contract validation
- **Rate-limit primitive** (`frontend/src/lib/bff-rate-limit.ts`) — Per-IP rate limiting with Redis store (atomic Lua INCR+PEXPIRE+PTTL) + memory fallback; table-driven limits config (login/register/OTP); test mode helpers gated on `VITEST=true`
- **Wired into 13 auth routes** — `/auth`, `/auth/callback`, `/verify-otp`, `/refresh`, `/logout`, OAuth callbacks + 7 more; `/refresh` keyed by `sha256(refreshToken)` not IP (principal isolation)
- **Error normalization** (`frontend/src/lib/bff-error-normalize.ts`) — Backend 429 responses normalized to standard error shape; `RegisterForm` 350ms username debounce parallel to email debounce
- **Full contract test suite** (152 tests pass) — IP resolution, threshold enforcement, 429 responses, principal isolation, refresh token keying, runtime invariants

#### Mobile Code Review Remediation — Auth Token Refresh, Service Modularization, Testing Foundation (2026-05-15)
- **Refresh token flow**: Added `refresh_token?: string | null` to `AuthToken` contract. Mobile session-store persists refresh token in SecureStore with REFRESH_KEY, deletes when absent (token rotation safety). Client.ts implements singleton `refreshPromise` + `_retried` flag for concurrent-401 deduplication. SessionProvider injects `setRefreshHandler()` on mount, wiring `authService.refreshToken()` callback. 29 tests cover session persistence, concurrent refresh handling, token lifecycle.
- **API client hardening**: 401-retry logic waits on singleton `refreshPromise` (prevents thundering herd), retries original request with new token, clears session + calls unauthorized handler on refresh failure. Timeout handling improved with AbortController + 30s default.
- **Service modularization**: Split `services.ts` (609 LOC) into 15 domain files (auth-service.ts, appointment-service.ts, chat-service.ts, dashboard-service.ts, health-goal-service.ts, meal-service.ts, medication-service.ts, notification-service.ts, nutrition-service.ts, preference-service.ts, profile-service.ts, reminder-service.ts, report-service.ts, risk-service.ts, visit-brief-service.ts). Barrel export `index.ts` preserves 100% backward compatibility — all existing imports still work.
- **File naming standardization**: Renamed 96 PascalCase component/utility files to kebab-case (per code-standards), updated 130 import paths. Examples: `ForgotPasswordScreen.tsx` → `forgot-password-screen.tsx`, `TopBar.tsx` → `top-bar.tsx`.
- **Dead code removal**: Deleted `mobile/src/components/auth/ForgotPasswordScreen.tsx` (superseded by onboarding flow).
- **Testing infrastructure**: Added jest + jest-expo + @testing-library/react-native. 3 test files with 29 tests covering session-store (getAccessToken, getRefreshToken, getCachedUser, saveAuthToken, clearStoredSession), apiRequest (timeout, 401 handling, error normalization), authService (login, logout, refreshToken).
- **Architecture documentation**: ADR-001 in container-diagram.md formally documents mobile→Core BE direct connection (Bearer token via SecureStore, no BFF layer), rationale (eliminates cookie/CORS/SSR overhead), and constraints (HTTPS required in prod, must handle 401 refresh).

#### Mobile Phase 9: Visual Detail Polish — Notifications, Quiet Hours, Inputs, Sheets, Dialogs (2026-05-14)
- **14 tasks complete**: Notification preference grouped cards (IconTile, GroupCard, PrefRow with critical badge, channel/delivery sections), Quiet Hours ring SVG (24-segment donut with center time/quiet labels + day chips + exception rows), Notification off-state hero (OffHero when master=false, email fallback chip), Input focus halo (3px outer brand halo at 18% opacity) + height 50 + disabled chip fill, Select/dropdown affordances (trailingIcon, editable=false), Attachment upload list (single clipped grouped card), Bottom sheet polish (handle color borderStrong, width 40), Destructive dialog polish (icon tile, meta pill, vertical action stacking, 0.5 scrim). Refs 120–129. All theme parity (calm/night/warm). TypeScript clean, ESLint clean.
- **Files modified**: Toggle.tsx (added disabled prop), Input.tsx (focus halo, height 50, disabled fill), BottomSheet.tsx (handle color/width), CenterDialog.tsx (icon, meta, vertical actions, scrim), reminder-preferences-screen.tsx (full rework: GroupCard/PreferenceRow locals, master card, categories/channels clipped, quiet hours integration), quiet-hours-ring.tsx (NEW: SVG donut ring with 24 segments, center labels, legend, day chips), AppointmentDetailScreen.tsx (cancel modal polish: icon tile, danger meta pill, vertical stacking), AttachmentUploadScreen.tsx (clipped upload list card).

#### Mobile Phase 6: Insights UI Polish (2026-05-13)
- **Risk screens**: RiskGauge (theme-aware semicircle, success/warning/danger color segments, needle marker), RiskOverviewScreen (skeleton refresh state), RiskDetailScreen (redesigned hero with ProgressRing + FactorProgressRow)
- **Goals Hub**: GoalsHubScreen (LinearGradient hero with theme colors—calm blue, night dark, warm orange—decorative blob, check-in ProgressRing), CreateGoalScreen (4-step wizard with StepProgress bar, enhanced WizardStep1-4)
- **Reports Hub**: Rich state UX—loading ProgressRing with sparkle icon, generating with step checklist (collecting vitals → analyzing trends → building insights → finalizing), empty state, error handling
- **Prevention screen**: Filter chip bar (Cardiovascular, Nutrition, Activity, Stress categories), enhanced SuggestionCard (effort dots 1–3, benefit pills green-accent), BackBar with filter button
- **8 files modified**: mobile/src/components/insights/{risk,goals,reports}/*.tsx, all TypeScript typecheck clean

#### Mobile Native Interaction Audit (2026-04-30)
- **All 5 phases completed**: Auth validation/OTP/setup; home search/notifications/KPI/cards/chat handlers; care filter/detail/appointment confirmation; medication form validation/detail sheet/loading states; profile menu wiring/SectionHeader guard/BottomTabBar real badge.
- Auth flows: Welcome/sign-in/sign-up/OTP validation, password reset, onboarding permissions with validation and disabled submit states.
- Home/dashboard: Search handler, notifications routing, KPI card drill-down, next-up reminders, action handlers, chat integration.
- Care workflows: Appointment filter/detail flows, visit prep guards, appointment confirmation, form validation, empty/loading/error states.
- Medications: Form validation, dose tracking, refill alerts, detail sheets, medication history, archive/pause actions, duplicate-submit prevention.
- Profile/settings: Menu wiring, health profile routes, device/emergency/goals handlers, settings sheets, section header action guards, bottom tab bar badge logic.
- TypeScript typecheck passes. All screens manually verified for working behavior or explicit guarded dependency states.

#### Mobile Phase 1 Foundation (React Native App)
- **Full Expo/React Native app** under `mobile/` with React Native 0.79 + Expo SDK 53 + Expo Router v5
- **5-tab navigation** (home, care, chat, meds, me) with bottom tab bar + nested routes
- **Auth screens**: welcome, OTP, sign-in, sign-up, health profile setup
- **Home tab**: KPI rings (health score, adherence, streaks), today's vitals, labs, plan, AI insights
- **Care tab**: appointments (list, detail, create), video prep, video visit, history
- **Chat tab**: conversation list, messages, AI chat (Stranger requests)
- **Meds tab**: add, edit, import, detail, refill, pause, archive, history, adherence tracking
- **Reusable forms**: intake, symptoms, medication, insurance questionnaires
- **Theme system**: 3 themes (calm/blue, night/dark, warm/earthy) with AsyncStorage persistence + auto OS dark-mode detection
- **Component library**: Primitives (Button, Card, Chip, Avatar, Divider, Toggle, IconButton, PressableCard) → Layout (Screen, TopBar, SectionHeader) → Charts (ProgressRing, Sparkline) → Domain features
- **Typography**: 7 scales (display, title, h3, body, bodyMed, caption, micro) with Inter font
- **Locale support**: English + Vietnamese (react-native-i18n)
- **Design catalog**: Web mobile preview screens in `screen-catalog.ts` for design validation
- **Status**: UI-first, Phase 1 foundation complete; Phase 2 will add BFF API wiring

### Changed

#### Mobile
- Clarified repository docs to reflect mobile as a distinct React Native product surface (not web simulation)

#### Documentation

- Aligned `system-architecture.md` to current backend surface:
  - Router inventory updated to 27 mounted routers
  - BFF route-handler surface updated to 120 routes
  - Known-gap table corrected for notifications, legacy WS deprecation behavior, and BFF `/plans` drift risk
- Aligned `code-standards.md` with current runtime behavior:
  - Rate-limit table now reflects authenticated-user limiter for MFA routes and WS burst model
  - Added BFF proxy hardening expectations (error normalization, timeout and body-size caps)
  - Branch strategy language now matches `dev`-gated CI/protection workflows
- Aligned `project-roadmap.md` with current status:
  - Notification center backend status corrected to implemented routes
  - Testing roadmap adjusted from legacy “13 tests” to current suite scale with remaining depth gaps
  - Current-focus section simplified to active streams backed by current repo state
- Aligned `deployment-guide.md` with actual workflow triggers and sync semantics:
  - Release workflows now documented as branch-push driven (with manual-dispatch fallback)
  - Added note that both dev-sync workflows can fire on the same qualifying release commit
- Aligned `security.md` with current implementation details:
  - Corrected method/strategy specifics for rate-limited endpoints
  - Updated cookie SameSite note to `Lax` and documented additional known gaps (legacy WS deprecation route, `/api/v1/plans` drift, notification provider gaps)
- Refreshed metadata/version stamps for updated core docs to `1.2.3-docs` / `2026-04-21`.

#### Frontend

- **Chat end-to-end review implementation** (2026-04-18):
  - Virtuoso: `scrollToIndex('LAST')`, `firstItemIndex` + `startReached` / `loadMore`, stable footer, `rangeChanged` for date chip, `conversationId` reset, new-message badge on scroll-to-end
  - `MessageBubble`: stable action callbacks, toolbar above bubble on desktop, long-press sheet on touch, `SheetTitle` i18n
  - `useChat`: removed debug ingest fetch; `pinMessage` uses functional state; `loadMore` returns prepend count; `simulateAIReply` takes translated text; `useMessages` optional `selfReactionLabel`
  - Deleted unused `useChatScroll.ts`; `ChatLayout` uses `pendingRequests` from `useStrangerRequests`
  - i18n: date jump sheet, scroll chip aria, unknown user, pinned expand/collapse, header more menu, `truncateChatPreview` shared constant

- **Dashboard shell refactor** (`dashboard/shell/`):
  - New: AppShell, MobileNav, SidebarNavGrouped, TopNavV2, NotificationsPopover, CommandPalette, nav-config, use-unread-conversations
  - Deleted: DashboardShell, SidebarNav, TopNav, GamificationSubNav, Decorations

- **Shared primitives** (auth, page, state components):
  - `shared/auth/primitives/`: AuthShell, AuthBanner, FormFieldError, OtpField, PasswordField, PendingButton, useBreachCheck, useResendCooldown
  - `shared/page/`: PageHeader, PageTabs, Stepper
  - `shared/state/`: StateView, EmptyState, Banner, InlineNotice, OfflineIndicator, StaleDataIndicator, StateCard

- **New UI primitives** (`components/ui/`):
  - confidence-chip, data-state, freshness-chip, permission-banner, source-badge

- **Onboarding & persistence**:
  - New: OnboardingWelcome, OnboardingReview components
  - New: `useOnboardingDraft` hook, `/api/v1/users/me/onboarding-draft` BFF route

- **Offline support**:
  - OfflineProvider, useOfflineQueue, useOutboundQueue, lib/offline-queue.ts

- **New routes**:
  - `/dashboard/health/add`, `/legal/privacy`, `/dev/kitchensink` (prod: 404), locale `not-found.tsx`
  - BFF: `/api/v1/notifications/[id]/read`, `/api/v1/reminders/[id]/skip`, `/api/v1/reminders/[id]/snooze`

- **UX enhancements**:
  - Reminders: NotificationPermissionBanner, RecurringExplanation, SnoozeMenu
  - Reports: KpiOverview
  - Progress: TodayInsightCard
  - Appointments: AppointmentCreateSheet

#### Mobile Design Parity Implementation (Phases 1A–5)
- **Phase 1A**: Tab navigation refactored — locale-aware Link routes + theme persistence across tab switches
- **Phase 1B**: Safe area insets applied — Screen layout padding: 56px tab-bar + dynamic bottom inset + 16px gutter
- **Phase 2**: Home detail screens — TodayOverviewScreen, HealthScoreDetailScreen, QuickActionSheetScreen; 3 new routes added
- **Phase 3**: Medication screens — 10 UI components (take, missed flows); MedicationFlowScreen extended; 2 routes added
- **Phase 4**: Care screens — 7 components (appointments, video, history); CareDetailScreen 7-kind handler; 3 routes added
- **Phase 5**: Auth completion — ForgotPasswordScreen, PermissionsScreen; AuthFlowScreen extended with permissionKind support; 2 routes added

#### Mobile Phase 7: Goals & Care & Me & Reminders Polish (2026-05-14)
- **22 tasks complete**: Goals wizard (refs 090–094: step bar, review card, hero gradient, streaks heatmap, milestones), Care hub (refs 095–096: hero buttons, 2×2 tiles, quick-access), Me hub (refs 099–100: compact identity, emergency soft variant), Home (ref 101: KPI density), Quick Action sheet (ref 102: 2-column grid, blur, cancel), Reminders (refs 103–104: ring snapshot, segmented status strip, filter chips, row states), Bottom tab parity across all routes. All theme parity (calm/night/warm). TypeScript typecheck clean. No behavioral changes, API changes, or new dependencies.
- **Files modified**: 15 component files (create-goal-wizard-* / goal-*-screen, care-hub-screen, IdentityCard, EmergencyCard, reminders-center-screen, reminder-row, QuickActionSheetScreen, BottomTabBar, and theme/token refinements).

#### Mobile Phase 8: Reminders & Notifications UI Detail Polish (2026-05-14)
- **Visual detail refinements** (refs 105–119): ReminderRow (inline time after title, action buttons right-aligned), ReminderDetailScreen (hero row layout, next-reminder branded card with Done/Snooze/Skip actions, 7-day adherence grid with day labels + 4-stat row, grouped settings card, BottomSheet action sheets), CreateReminderScreen (3×2 category tile grid, day-of-week repeat buttons, Save in backbar, notes textarea, push toggle row), NotificationsInboxScreen (pill tabs with count badges, grouped clipped cards NEW/EARLIER TODAY, inline action buttons), ReminderPreferencesScreen (brandSoft master card with large icon, clipped grouped cards for categories/channels, CRITICAL badge), ReminderTimelineScreen (vertical spine layout, NOW rule, status dots with halo, compact event cards, segmented day/week control). All components theme-aware (calm/night/warm). TypeScript typecheck clean. No behavioral changes, API changes, or new dependencies.
- **Files modified**: 7 component files (reminder-row, reminder-detail-screen, create-reminder-screen, notifications-inbox-screen, reminder-preferences-screen, reminder-timeline-screen, reminders-center-screen).

#### Mobile Micro-Polish Phase 5 (2026-05-13)
- **Phase 5 mobile visual detail polish complete** — 24 tasks (P5-01 to P5-24): meals screens (add-meal-screen, food-row, meal-scan-camera-screen, meal-scan-analyzing-screen, meal-scan-results-screen, meal-detail-screen, ingredient-row, macro-donut overlay, nutrition-trends-screen), reports/insights screens (insights-segmented-tabs, reports-hub-screen, report-detail-screen, report-export-screen), shared nav (BottomTabBar), theme parity (calm/night/warm), and shared atom polish (Card, Button, IconButton, Badge, ProgressBar, Toggle, BottomSheet, ProgressRing, Sparkline, Screen, TopBar, tab-bar-metrics). Visual refs 060-074. TypeScript typecheck clean, lint pass, no behavioral changes.

#### Mobile Micro-Polish Phase 3 (2026-05-07)
- **Visual refinements across 14 components** — No behavior changes, UI-only polish:
  - VitalsLineChart: Y/X axis labels, asymmetric padding, stronger dark-mode line
  - VitalsDetailScreen: SegmentedControl range selector, tighter chart card, bgElev stats row with dividers
  - QuickActionSheetScreen: lucide icons in grid (replaced letter glyphs)
  - HealthScoreDetailScreen: ProgressRing replaces bare score, 6px category bars
  - HomeDetailScreen: hero card brandSoft, causes/actions list, CTA button
  - HeroAppointmentCard: marginBottom:12/marginTop:0, actions gap:10
  - AppointmentDetailScreen: 3 Modals → BottomSheet, 2-column date/time layout, TAB_BAR_CONTENT_HEIGHT scroll padding
  - JoinVideoVisitScreen: selfPreview border opacity, controls paddingBottom
  - VisitPrepScreen: 4px progress bar, checklist padding:16, TAB_BAR_CONTENT_HEIGHT scroll padding
  - CreateAppointmentScreen: text fields → Input primitive, visit-type → SegmentedControl, doctor Modal → BottomSheet
  - AttachmentUploadScreen: dashedCard padding:24, uploadIcon 56×56 brandSoft, rows → bgElev, sheets → BottomSheet
  - MedicalHistoryScreen: sep 70% height, visitRow marginBottom:10/no border, chip variant mapping, TAB_BAR_CONTENT_HEIGHT
  - PrescriptionDetailScreen: headerCard left-aligned rxIconBox, medCard chip row, barcode caption, CTA labels, TAB_BAR_CONTENT_HEIGHT
  - Skeletons.tsx: ChartSkeleton card-shaped with range pills + stats cells, timeline dot 10×10, listRow gap:14

---

## [1.2.2] - 2026-04-19

### Fixed / Security

#### Backend

- **Rate limiter fails CLOSED** (`core/rate_limit.py`) — Redis unavailability now returns HTTP 503 instead of allowing requests through
- **Meals bug fix** (`services/meals.py`) — `update_meal_result()` was passing `meal_id` as `user_id`; corrected argument mapping
- **Timing-safe login** (`core/security.py`) — Added `DUMMY_HASH` constant; bcrypt compare always runs (even for missing users) to prevent user-enumeration via timing side-channel
- **Atomic account lockout** (`services/auth.py`) — Lockout counter now uses a single atomic `UPDATE … WHERE` instead of ORM read-modify-write to eliminate TOCTOU race condition
- **OTP hardening** (`api/v1/endpoints/auth.py`):
  - OTP stored hashed (bcrypt) at creation time
  - OTP consumed atomically via Redis `GETDEL` (prevents replay)
  - Username collision returns HTTP 409 (was silent overwrite)
  - Dummy bcrypt compare on missing user during OTP verify (timing parity)
  - Accepted limitations documented: OAuth token introspection and WS presence not yet hardened
- **Input validation** (`schemas/chat.py`, `schemas/auth.py`):
  - `AttachmentDTO.url` restricted to `^https?://`
  - Chat `content` fields have `max_length` constraints
  - Emoji field capped at 64 bytes
  - `MedicalInfo` fields have `max_length` constraints
- **WebSocket rate limiting extended** (`ws/chat_router.py`) — `msg:edit` and `msg:delete` now rate-limited alongside `msg:send`; emoji byte-length validated server-side
- **In-process presence limitation documented** (`ws/handlers.py`) — Known limitation (presence not shared across replicas) noted in code
- **Profile PATCH race condition** (`api/v1/endpoints/users.py`) — Profile update now uses `SELECT FOR UPDATE` to prevent concurrent-write conflicts

#### Frontend

- **Removed AI spoofing vector** (`hooks/useChat.ts`) — Display-name heuristic that could falsely flag messages as AI was removed; optimistic message IDs now use `crypto.randomUUID()`
- **Dev bypass gated by NODE_ENV** (`app/api/v1/auth/route.ts`) — Auth bypass path only available when `NODE_ENV !== "production"`
- **App-level error boundary** (`app/[locale]/(app)/error.tsx`) — New `error.tsx` prevents white-screen crashes in the `(app)` route group
- **DevicesPageClient error handling** (`components/dashboard/settings/DevicesPageClient.tsx`) — `handleSync` wrapped in `try/catch` to prevent unhandled rejections
- **Core API proxy hardening** (`lib/core-api-proxy.ts`) — 1 MiB request body limit + 30 s fetch timeout added
- **Client-side fetch timeout** (`lib/api-client.ts`) — 30 s `AbortSignal` timeout on all `bffFetchClient` calls
- **Server-side onboarding guard** (`app/[locale]/(app)/layout.tsx`) — Layout performs server-side onboarding check (defense-in-depth against forged `healthos.meta` cookie)

---

## [1.2.1] - 2026-04-06

### Added

#### Authentication Security Hardening

- **JWT Token Revocation & Blacklist** (`backend/app/`)
  - JWT tokens now include `jti` (JWT ID) claim
  - `revoke_token()` function adds token to Redis blacklist
  - On logout, token is revoked and invalidated immediately
  - `get_current_user` checks blacklist during API validation

- **IP-Based Rate Limiting** (`backend/app/core/rate_limit.py`)
  - Login attempts: 10 per minute per IP
  - OTP requests: 5 per minute per IP
  - API availability: 30 per minute per IP
  - Redis-backed counter with TTL expiry

- **MFA Security Enhancements** (`backend/app/services/mfa.py`)
  - TOTP secrets encrypted with Fernet (AES-128)
  - MFA recovery codes bcrypt-hashed before storage
  - Backward-compatible TOTP verification with timing-safe comparison
  - Anti-enumeration: same generic error for all MFA failures

- **HaveIBeenPwned Integration** (`backend/app/services/hibp.py`)
  - Password breach detection using HIBP k-anonymity API
  - Only first 5 SHA-1 chars sent (full password never leaves server)
  - Checked at signup time during OTP verification
  - Fails open — registration proceeds if HIBP unavailable

- **Frontend Security Headers** (`frontend/next.config.ts`)
  - X-Frame-Options: DENY (prevent clickjacking)
  - X-Content-Type-Options: nosniff (prevent MIME sniffing)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: geolocation=(), microphone=()

- **BFF Auth Improvements** (`frontend/src/`)
  - Meta cookie (`healthos.meta`) for onboarding state — no self-fetch required
  - Cookie-only auth middleware (no Bearer in fetch)
  - OAuth callbacks fixed — proper cookie names, meta cookie, locale-aware redirects
  - `parseApiError` handles error `detail` as dict; `ACCOUNT_NOT_FOUND_EMAIL` error code support

- **Enhanced Audit Logging** (`backend/app/models/audit.py`)
  - Event types: login_success, login_failed, account_locked, mfa_enabled/disabled/failed, OAuth flow events
  - Captures IP address, User-Agent, lockout duration, breach count
  - Accessible via `GET /v1/security-logs` (paginated, filterable)

---

## [1.2.0] - 2026-04-01

### Added

#### User Accent Color & Theme Customization

- **Backend Color Persistence** (`backend/app/`)
  - `accent_color` field on `UserProfile` model (String(7), nullable hex color)
  - Updated `UserProfileResponse` schema with accent_color
  - `GET/PATCH /v1/users/me` endpoints handle color updates
  - Migration `013_add_accent_color_to_user_profiles.py`

- **Frontend Theme Application** (`frontend/src/`)
  - `BlossomColorPicker` component — custom color picker using @dayflow/blossom-color-picker-react
  - `UserAccentColorApplier` — theme provider applying user accent across dashboard
  - `accent-utils.ts` — `deriveAccentTokens()` calculates CSS variables from hex color
  - Early hydration script (`public/accent-early.js`) — applies theme before app bundle loads (minimal flash)
  - CSS custom properties overridden: `--primary`, `--primary-foreground`, `--ring`, `--chart-1`, `--chart-2`
  - Contrast calculation: `getContrastColor()` ensures WCAG-style 4.5:1 contrast ratio

- **Settings Integration** (`frontend/src/app/[locale]/(app)/dashboard/`)
  - Color picker in dashboard settings page
  - Real-time theme preview while selecting
  - Persist to localStorage (`healthos-accent`) for hard-reload consistency
  - Fallback to `UserProfile.accent_color` on first visit

- **i18n Support**: Accent color labels added to `vi.json` and `en.json`

- **Dashboard Components Updated**
  - BmiScoreCard: accent color for header gradient
  - StreakCalendar: accent color for filled dates
  - Progress rings: accent color for ring fill
  - Chart components: accent color for data series

---

## [1.1.0] - 2026-03-25

### Added

#### User-Configurable BMI/Weight Goals (end-to-end)

- **BE Layer** (`backend/app/`)
  - `models/health_goal.py` — SQLAlchemy model for `user_bmi_goals` table (separate from activity `user_health_goals`); stores only `target_weight_kg` + `current_height_cm` (BMI always derived)
  - `schemas/health_goal.py` — Pydantic schemas requiring at least one of `target_weight_kg`/`current_height_cm`; deadline ≥ today
  - `services/health_goal.py` — CRUD service with ownership checks
  - `api/v1/endpoints/health_goals.py` — CRUD endpoints: GET/POST/PATCH/DELETE at `/v1/health-goals`
  - Migration `011_add_bmi_weight_goals.py` — creates `user_bmi_goals` table

- **BFF Layer** (`frontend/src/app/api/v1/`)
  - `health-goals/route.ts` — GET + POST (with per-user Redis cache keyed by JWT-decoded userId)
  - `health-goals/[id]/route.ts` — PATCH + DELETE

- **FE Data Layer** (`frontend/src/`)
  - `lib/api-client.ts` — client-safe `bffFetchClient()` for `"use client"` components
  - `lib/gamification-data.ts` — `getUserBmiData()` fetches `/api/v1/health-goals` + `/api/v1/analytics/gamification-summary` in parallel; `targetBmi` always derived from `target_weight_kg / (height_cm/100)²`

- **FE UI Layer** (`frontend/src/`)
  - `components/dashboard/progress/HealthGoalDialog.tsx` — react-hook-form dialog with only target height + target weight inputs; BMI auto-calculated (read-only) + healthy-weight recommendation hint under each input (BMI=22 ideal)
  - `components/dashboard/progress/ProgressPageClient.tsx` — client component wrapping stat cards + chart + dialog
  - `app/[locale]/(app)/dashboard/progress/page.tsx` — hybrid Server Component fetches `bmiData` + `weightHistory` in parallel, passes to `ProgressPageClient`

- **i18n**: All progress dialog labels (`setGoal`, `editGoal`, `deadline`, `targetHeight`, `targetWeight`, `bmi`, `bmiAutoHint`, `recWeight`, `recHeight`, etc.) added to `vi.json` and `en.json`

---

## [1.0.0] - 2026-03-24

### Added

#### Charts & Analytics
- **BFF Analytics Routes** (`/api/v1/analytics/`)
  - `GET /analytics/weekly-summary` — Weekly calories, meals, weight aggregation
  - `GET /analytics/monthly-summary` — Monthly trends
  - `GET /analytics/period-comparison` — Current vs previous period
  - `GET /analytics/goal-progress` — Progress toward user_health_goals
  - `GET /meals/calories-summary` — Daily/weekly calorie aggregation

- **Chart Components** (`frontend/src/components/dashboard/analytics/`)
  - `TimeRangeSelector.tsx` — Period selection (7d/30d/90d/custom)
  - `PeriodComparisonChart.tsx` — Side-by-side period comparison
  - `StreakHeatmap.tsx` — Activity streak calendar heatmap
  - `BmiProgressChart.tsx` — BMI trend with goal visualization

- **Chart Export Utilities** (`frontend/src/lib/chart-export.ts`)
  - `frontend/src/components/charts/chart-export-utils.ts`
  - `downloadChart()` — Download an ECharts chart as PNG/SVG
  - `downloadDashboardCharts()` — Export a dashboard grid to a PNG image

- **Backend Aggregation Endpoints**
  - Weekly/monthly data aggregation with period comparison
  - Goal progress calculation
  - Streak tracking (meals, activity)

- **Database**
  - `user_health_goals` table — Health goal targets per user

- **Caching**
  - Redis caching for analytics queries (5-min TTL)

#### Testing
- Initial backend test scaffolding (current count as of v1.2.2: 13 backend test functions across 3 files)

---

## [0.9.0] - 2026-03-23

### Added
- Authentication & Authorization (login, register, OTP, MFA)
- Profile onboarding (5-step wizard)
- User profile management with username field
- Dashboard with vitals, reminders, summary
- Meals diary with photo upload and nutrition tracking
- Appointments and reminders management
- Reports with health reports and trend analysis
- Risk predictions
- Real-time chat system (WebSocket)
- Devices page with BFF wiring
- i18n support (Vietnamese + English)
- BFF pattern implementation (46 route handlers)
- Redis caching for OTP and session management

---

## [0.1.0] - 2026-01-01

### Added
- Project scaffolding
- Backend FastAPI structure
- Frontend Next.js structure
- Docker Compose setup
- Database models and migrations
