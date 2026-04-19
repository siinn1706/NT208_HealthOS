# Mobile changelog

All notable changes to the `mobile/` workspace. The mobile app talks directly
to the FastAPI Core BE on `/v1/...` — there is no Next.js BFF in the runtime
path. Backend audit and the original implementation plan live at
[`.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md`](../.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md).

## 0.1.0 — Initial Android-first MVP

### Architecture

- Expo SDK 52 + React Native 0.76 + TypeScript strict.
- Expo Router (file-based) with bottom tabs and grouped auth/onboarding stacks.
- TanStack Query v5 for server state; persisted query cache via AsyncStorage.
- React Hook Form + Zod for every form.
- Expo SecureStore (Keystore on Android) for the JWT.
- Direct Bearer auth against Core BE; no cookies, no BFF, no shared secrets.
- Per-channel bundle ids (`com.healthos.app.dev` / `.staging` / no suffix).
- Production-only env scheme guards (no `http://` for `CORE_API_URL` or
  `ws://` for `CORE_WS_URL` in `prod` builds).

### Auth & account

- Email/password login, OTP signup with HIBP breach detection, OTP login,
  3-step forgot-password.
- MFA enroll → QR display → verify-setup → recovery codes (in-memory
  single-use store with TTL — codes never pass through navigation params).
- Disable + regenerate recovery codes.
- Logout (revokes JWT via Redis blacklist on Core).
- Account export (poll-based async pipeline → signed download URL).
- Account delete (soft-delete, 30-day grace, JWT revocation in same txn).

### Health

- Dashboard summary (single Core call) on Home with KPIs, alerts, AI insight.
- Vitals timeseries chart (HR + BP) with 7/30/90-day toggle.
- Health metrics CRUD + aggregates + period comparison.
- Health goal CRUD + goal progress chart.
- Risk insight (synchronous Core call).

### Meals

- Paginated meals list with FlashList.
- Manual meal logging via JSON.
- Snap flow: camera/gallery → image-manipulator resize → async analyze-photo
  with poll-and-display nutrition.
- Today's calories (with client-side fallback when the suspect
  `/v1/meals/calories-summary` route 422s).

### Reminders

- CRUD + upcoming feed.
- Local notification scheduling via `expo-notifications` (Core has no
  scheduler — mobile owns the firing).
- Server-driven occurrence model (snooze/skip/done) when available.

### Appointments

- List + create (no field edits — backend doesn't expose a PATCH).
- Status update via FSM-validated `PATCH /{id}/status` for cancel/complete.

### Reports

- 7/30/90-day report + trends as JSON.
- Async PDF export with poll-and-open via `expo-linking`.

### Chat

- Conversation list + pending invites accept/reject.
- User lookup + create direct/group conversations.
- Room screen with cursor-paginated messages, optimistic send,
  edit/delete/react/pin.
- Throttled mark-read.
- WebSocket realtime via short-lived ws-ticket → `/ws?token=...`.
- Client-side dedupe of legacy + canonical broadcast pairs.
- REST fallback when WS isn't open.
- Reconnect with exponential backoff + jitter; ticket refresh on 4001.

### Settings

- Profile edit + avatar upload (resized + compressed before upload).
- Preferences with live theme + accent color binding to backend.
- Connected wearable devices (list / connect / sync / disconnect).
- Security log (paginated).
- Biometric re-auth toggle.

### Notifications & deep links

- Tapped local notification routes to the right screen
  (foreground / background / cold-start).
- Custom URL scheme `healthos://` registered in AndroidManifest.

### Observability

- Centralized `reporter.ts` shim — vendor-pluggable for
  Sentry/Crashlytics/Bugsnag with one call to `setReporterAdapter()`.
- Domain (4xx) `ApiError`s deliberately suppressed from crash logs.
- User identity propagated to the adapter on login/logout.
- Production builds silence `console.log/debug/info` to keep Logcat clean.

### Tests & CI

- 10 Jest suites / 59 tests covering: API client (fetch mock), error
  normalizer, WS event mapping, WS client lifecycle + reconnect, recovery
  codes store, session helpers, date helpers, debounce, observability shim,
  i18n parity.
- `tsc --noEmit` passes against strict + `noUncheckedIndexedAccess` +
  `noImplicitOverride`.
- `npx expo prebuild --platform android` generates a valid native project.
- GitHub Actions workflow (`.github/workflows/mobile-ci.yml`) runs all of
  the above on every PR touching `mobile/**`.

### Production guardrails

- `env.ts` validates URL schemes at module load and refuses non-TLS hosts in
  production builds.
- `LogBox.ignoreLogs()` curated list (audited).
- Recovery codes never pass through router params.
- WebSocket client dedupes events by `server_message_id` to handle the
  backend's dual-broadcast pattern (legacy + canonical).
- TanStack Query `onlineManager` wired to `NetInfo` so queries pause
  cleanly when offline.

## Known gaps (need backend cooperation)

- **Refresh tokens.** Core only issues a ~60-min access JWT. The app shows
  a re-auth modal on 401; no silent refresh is possible until Core exposes
  a refresh endpoint.
- **OAuth (Google / GitHub).** `POST /v1/auth/token` is gated by
  `X-BFF-Secret` (BFF-internal); a native client cannot complete it. Email
  OTP covers MVP.
- **Push notifications.** No FCM device-token registration endpoint
  exists. Reminders fire client-side via `expo-notifications`.
- **AI assistant replies in product chat.** `chat_service.send_message`
  doesn't invoke the AI worker. The AI conversation type exists but is
  hidden behind `EXPO_PUBLIC_AI_FEATURES_ENABLED=false`.
- **Chat image attachments.** No Core upload route for chat exists.
- **Restore-during-grace UI.** Needs `deleted_at` on the `CurrentUser`
  schema so the app can detect a soft-deleted account at sign-in.
- **Field-level appointment edits.** Status PATCH exists, but rescheduling
  the doctor/time/clinic doesn't.
