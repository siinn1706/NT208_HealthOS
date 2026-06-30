# HealthOS Current Status

Last updated: 2026-06-30

## Implemented

- Browser HTTP traffic uses the Next.js BFF route surface under `/api/v1/**`; Core routes remain server-side `/v1/**` targets.
- Password login enforces MFA challenge when `mfa_enabled=true`; clients complete sign-in through `/v1/auth/login/mfa`.
- Core auth, profile, dashboard, meals, reports, appointments, reminders, medications, plans, onboarding drafts, emergency profile, device management, and notification list/read/unread routes are implemented.
- In-app notification persistence is implemented in Core and is used by the backend notification dispatch task for `in_app` dispatch.
- AI meal photo analysis is implemented through Core meal upload/status routes and the AI worker `/analyze` path when the AI worker is running and configured.
- Mobile login, signup, forgot-password/reset, token refresh, session clearing, direct Core API calls, WebSocket ticket flow, and Home AI advice open flow are implemented for the native app; the Home AI card now opens `/home/insight/current`, and the detail screen uses `dashboardService.aiAdvice(locale)` with loading, ready, and retry states instead of weekly/monthly summary fallback content.

## Partial

- Standalone notification service `/dispatch` validates demo payloads and can send email through SMTP when SMTP env vars are configured. It reports skipped states for unconfigured providers.
- WebSocket realtime chat is available through Core `/ws`; clients must use short-lived WS tickets. Presence is still single-process/in-memory.
- PDF/report export has backend task support, but full production rendering/provider polish is not the focus of the final demo.
- Mobile API coverage is broad but not every UI affordance is a production-complete workflow.

## Stub

- Push notifications are not wired to FCM/APNs.
- SMS notifications are not wired to a provider.
- Standalone queue-worker service keeps wearable tasks as stubs.
- Leaderboard/social features remain future work.

## Out of Scope

- Wearable sync is owned by another teammate and is not part of this demo-readiness pass.
- Production hardening/startup guard work is not part of this pass.
- Whole-app redesign is not part of this pass.

## Demo-Supported Paths

- Web login and MFA challenge.
- Dashboard/profile/meals/reminders/notifications through BFF `/api/v1/**`.
- Admin seed/delete scripts for local demo accounts.
- Notification dispatch demo through Core in-app task or standalone SMTP `/dispatch`.
- AI meal/photo analysis when backend, MinIO, and AI worker are running.
- Mobile login/API demo against Core with SecureStore-backed session lifecycle.
