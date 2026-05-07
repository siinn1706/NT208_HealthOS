# HealthOS — Project Changelog

> **Version**: 1.3.0-docs | **Last Updated**: 2026-04-28

---

## [Unreleased]

### Added

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
  - Updated cookie SameSite note to `Lax` and documented additional known gaps (legacy WS deprecation route, `/api/v1/plans` drift, notification dispatch stub)
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
