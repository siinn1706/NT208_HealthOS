# HealthOS — Project Changelog

> **Version**: 1.3.3-docs | **Last Updated**: 2026-05-15

---

## [Unreleased]

### Added

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
