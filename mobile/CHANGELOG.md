# Mobile changelog

All notable changes to the `mobile/` workspace. The mobile app talks directly
to the FastAPI Core BE on `/v1/...` — there is no Next.js BFF in the runtime
path. Backend audit and the original implementation plan live at
[`.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md`](../.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md).

## 0.1.0 — Initial Android-first MVP

### Theming consistency + mobile-first UX polish audit

The app's theme module is solid (tokens, dark/light palettes, accent
override, system-scheme listener), but inline magic numbers had crept
into ~10 screens — `borderRadius: 999`, `borderRadius: 12`,
`fontSize: 10/11`, `padding: 16`, raw `fontWeight: "700"`. Each was
near-equal to a token but used the literal anyway, which means a
future tweak to `radius.pill` or `typography["2xs"]` wouldn't
propagate to those sites.

| # | Site | Inline value | Replacement |
|---|---|---|---|
| 1 | More tab user-avatar | `borderRadius: 999` | `radius.pill` |
| 2 | Meal-detail Stat tile, Home KPI tile, Security MFA QR frame | `borderRadius: 12` | `radius.md` (10 — visual diff is 2dp, unanimous now) |
| 3 | Chat connection-status dot | `borderRadius: 4` | new `radius.xs` token |
| 4 | Chat conversation Avatar | raw `fontWeight: "700"` (broken — referenced `theme.fontWeights` that wasn't in scope) | `fontWeights.bold` from `useTheme()`; refactored Avatar to call `useTheme()` itself instead of accepting tokens via props |
| 5 | Chat conversation list unread-badge count | `fontSize: 11` | new `typography["2xs"]` token (with proper `lineHeight: 14`) |
| 6 | Chat room edited-tag + timestamp | `fontSize: 10` | `typography["2xs"]` (slight bump from 10 to 11 — improves Material label-small accessibility) |
| 7 | Meals list ListEmptyComponent / ListFooterComponent | `padding: 16` (×4 inline copies) | hoisted `EMPTY_PAD = { padding: spacing.base }` const, reused on every render |
| 8 | Meals header KPI gap | `marginTop: 4`, `gap: 4` | `spacing.xs` |
| 9 | Reports header action buttons | `gap: 8` | `spacing.sm` |
| 10 | Home KPI tile | `gap: 4` | `spacing.xs` |
| 11 | `+not-found.tsx` | `fontSize: 24/16`, `padding: 20`, `marginTop: 16` | `typography["2xl"]` / `typography.base` / `spacing.lg` / `spacing.base` |

#### New tokens

```ts
radius: {
  xs: 4,            // NEW — connection dots, fine micro chrome
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
}

typography: {
  "2xs": { fontSize: 11, lineHeight: 14 },  // NEW — badge counts, micro labels
  xs:    { fontSize: 12, lineHeight: 16 },
  ...
}
```

Both have JSDoc explaining when to reach for them so the team doesn't
re-introduce the inline magic numbers.

#### Bonus refactor (cleaning up wrong-abstractions audit residue)

`<Avatar>` in `chat/index.tsx` previously took `colors` + `radius` as
props with the convoluted
`ReturnType<typeof useTheme>["colors"]` typing. While I was in there
fixing the broken `theme.fontWeights.bold` reference, I switched it
to call `useTheme()` itself — the hook is cheap and the prop-drilled
version was a known smell from the wrong-abstractions audit.

#### New tests

`__tests__/theme/token-consistency.test.ts` (7 tests) is a CI guard
that scans every `.ts/.tsx` under `src/` and `app/` for the patterns
the cleanup eliminated:

- No `borderRadius: 999` (use `radius.pill`)
- No `borderRadius: 12` (use `radius.md`)
- No `borderRadius: 4` (use `radius.xs`)
- No raw numeric `fontWeight: "600"` / `"700"` (use `fontWeights.semibold` / `.bold`)
- No raw `fontSize: 10` / `fontSize: 11` (use `typography["2xs"]`)
- No raw `padding: 16` (use `spacing.base`)
- The token table itself is internally consistent (catches typos in
  `tokens.ts` that would silently shift the entire scale).

The scan exempts:
- `src/theme/{tokens,colors,index}` — the source of truth
- `app/(tabs)/more/preferences.tsx` — the accent palette IS the data
- `app/(tabs)/_layout.tsx` `tabBarLabelStyle` — `expo-router` doesn't
  accept a Theme dependency at config time, and `fontSize: 11` is the
  Material spec value for tab labels

290 / 290 tests pass; `tsc --noEmit` clean; `expo-doctor` 17 / 17.

Audited but **already correct**:

- `<ScreenScroll>` and `<AuthShell>` already use theme tokens for
  every padding / gap / radius they apply.
- `<Card>`, `<Button>`, `<Badge>`, `<Input>`, `<PageHeader>`,
  `<DateTimeField>`, `<PillGroup>`, `<SegmentGroup>`, `<Toast>`,
  `<OfflineBanner>`, the loading/empty/error state primitives — all
  pull tokens from `useTheme()` exclusively.
- The dark/light palette + accent-color override + system-scheme
  listener were already wired correctly (`ThemeProvider`).
- `Appearance.addChangeListener` correctly cleans up on unmount.

### Accessibility / touch target / keyboard / safe-area audit

The app already had `KeyboardAvoidingView` + `keyboardShouldPersistTaps`
+ `react-native-safe-area-context` wired correctly at the shell level
(`ScreenScroll`, `AuthShell`). The audit picked off the smaller-class
issues — bare `<Pressable>` rows that weren't focusable via TalkBack /
VoiceOver, touch targets below the WCAG 2.1 AA 44dp / Material 48dp
minimum, and one nasty Android keyboard double-resize.

| # | Site | Issue | Fix |
|---|---|---|---|
| 1 | More tab `Row` (used 7×) | No `accessibilityRole`/`Label`/`Hint`; chevron read by screen reader | Added role+label+hint; `minHeight: 48`; chevron hidden via `accessibilityElementsHidden` |
| 2 | `security/index` Export+Delete rows | Same — destructive action with no a11y identity | Added role+label+hint, `minHeight: 48`, hidden chevron |
| 3 | `preferences` accent color picker | Color swatches with NO label — VoiceOver/TalkBack users couldn't tell what they were selecting | Added per-color `Teal/Blue/Purple/Red/Amber/Cyan` labels, wrapped in `radiogroup`, each swatch is a `radio` with `accessibilityState.selected` |
| 4 | `ScreenScroll` Android `KeyboardAvoidingView` | `behavior="height"` was double-firing on top of `softwareKeyboardLayoutMode: "resize"` (set in `app.config.ts`) — chat composer + form fields jumped twice | `behavior={undefined}` on Android; let the OS resize natively |
| 5 | `reminders/add` type+repeat inline pills | No a11y, ~28dp touch target | Refactored to use `<PillGroup>` (gets WCAG 44dp, `radio`+`radiogroup` roles, `selected` state for free) |
| 6 | `reports/export` section toggle | Multi-select chips with no a11y, ~32dp touch target | Each chip is now an `accessibilityRole="checkbox"` with `accessibilityState.checked`; `minHeight: 44` |
| 7 | `reminders/index` mark-done + delete inline buttons | ~32dp touch target, no role/label | Added `role="button"`, descriptive label that includes the reminder title (so VoiceOver reads "Delete Vitamin D"), `minHeight: 44` with centered content (visible padding stays compact) |
| 8 | `<PillGroup>` and `<SegmentGroup>` themselves | ~28-38dp tap targets | Both now declare `minHeight: 44` + centered content. Visible chip size unchanged (the floor is enforced via min-height + justify-center). |

New tests at `__tests__/components/accessibility.test.tsx` (6 tests):

- PillGroup pills set `minHeight >= 44`.
- SegmentGroup segments set `minHeight >= 44`.
- PillGroup marks the active pill as `selected` and the rest as `not selected`.
- SegmentGroup marks the active segment as `selected`.
- PillGroup falls back to the visible label when no `accessibilityLabel` is set.
- PillGroup honors a custom `accessibilityLabel` for cases where the visible label is non-descriptive (e.g. `"7d"` → `"7 days"`).

The tests deliberately probe `props.style` and `accessibilityState`
rather than snapshotting visible chrome — a regression fires only if
the *contract* breaks (touch target shrinks below 44dp, selected state
stops being announced), not on cosmetic style edits.

283 / 283 tests pass; `tsc --noEmit` clean; `expo-doctor` 17 / 17.

Audited but **already correct**:

- `<ScreenScroll>` uses `keyboardShouldPersistTaps="handled"` (so a tap
  on a button while the keyboard is up doesn't get swallowed by the
  dismiss gesture).
- `<AuthShell>` already uses the correct
  `behavior={Platform.OS === "ios" ? "padding" : undefined}` pattern.
- `<Button>` declares `accessibilityRole="button"` +
  `accessibilityState={{ disabled, busy }}`, sized at 44/48/52dp by
  variant.
- Chat composer Send button: `minHeight: 44`, role+label+disabled
  state correct.
- `react-native-safe-area-context` `<SafeAreaView>` is used everywhere
  the shell components don't apply (chat conversation, onboarding
  wizard, meals list).

### Unnecessary-rerender audit

The biggest finding was a **context-value identity bug in
`<ToastProvider>`**: `value` was a fresh object on every render and
the `success` / `error` / `info` methods were fresh closures. Every
time anyone fired `toast.success(...)`, `setToasts` re-rendered the
Provider, which invalidated the context value, which cascaded a
re-render through **every screen** that called `useToast()`. That's
~95% of the app, including all the heavy list screens.

Fixes shipped:

- **`<ToastProvider>` value memoization.** Wrapped the value in
  `useMemo([show])` (`show` itself is already `useCallback`-stable).
  Toast show/dismiss now only re-renders the Provider's own subtree,
  not its consumers.
- **`<NetworkProvider>` value memoization.** Same pattern — was a
  fresh `{ isOnline, type }` object every render. Lower impact (the
  Provider only re-renders on NetInfo events, ~rarely) but free win.
- **`<ThemeProvider>` setters wrapped in `useCallback`.** The setters
  were captured by `useMemo` on first render and never refreshed,
  which happened to work because they only reference module-level
  helpers + React's stable `setState` — but is fragile. Now
  explicitly stable via `useCallback`, and added to the `useMemo`
  deps array so ESLint exhaustive-deps stops flagging.
- **Memoized `flatMap` + `filter` in 3 list screens.** `meals/index`,
  `more/appointments/index`, and `health/metrics/[type]` were
  recomputing `list.data?.pages.flatMap((p) => p.data) ?? []` on
  every render — and the appointments screen also re-derived
  `upcoming` and `past` via two extra `.filter()` passes per render.
  All three are now `useMemo`'d on `list.data`. The biggest win is
  on `meals/index` (FlashList), which previously got a fresh `data`
  array reference per render and re-ran cell layout for the entire
  list every time.
- **New tests** at `__tests__/components/Toast.test.tsx` (3 tests):
  - The toast handle is reference-equal across consumer re-renders.
  - A consumer's `useEffect` that depends on the handle runs exactly
    once (would have run on every render before the fix).
  - The handle stays stable while toasts are being shown and the
    auto-dismiss timer fires.
- 277 / 277 tests pass; `tsc --noEmit` clean; `expo-doctor` 17 / 17.

Smaller items that were AUDITED but left in place:

- `Button.tsx` recomputes a `sizeStyles` lookup table and a `palette`
  object on every render. Tiny per-instance cost, but multiplied
  across ~20+ buttons per screen. Worth cleaning up later but not
  critical compared to the Toast cascade above.
- `chat/[conversationId].tsx` already uses `useMemo` correctly for
  the flat message list and the merged optimistic view — left alone.
- Per-row inline `onPress` arrows in `meals/index` are made safe by
  the `MealRow` custom comparator that ignores `onPress` identity.

### Typing-quality audit

- **Baseline check**: zero `: any`, zero `as any`, zero
  `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` in `src/` or `app/`.
  `tsconfig.json` already has `strict: true` +
  `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`. The
  audit focused on the smaller class of "smelly cast / non-null
  assertion / unvalidated URL param" issues.
- **Centralized the RN-FormData-Blob cast.** TypeScript's standard
  DOM `FormData` only accepts `Blob | string`, but React Native lets
  you pass `{ uri, name, type }` directly. That meant every multipart
  endpoint had its own `as unknown as Blob` cast (3 copies in
  `meals.ts` + `users.ts`). Extracted into a single
  `appendFilePart(fd, name, file)` helper at
  `src/api/formdata.ts` — cast lives in exactly one place where it
  can be replaced if RN ever ships proper types. New `FilePart` type
  replaces the inlined `{ uri, name, type }` shape on every endpoint
  signature.
- **Removed two non-null assertions:**
  - `src/api/events.ts` — `EventBus.on` no longer needs
    `this.listeners[event]!.add(listener)`. The set is local-bound on
    first use; TypeScript narrows it without help.
  - `app/(tabs)/health/goal.tsx` — `deleteHealthGoal(goal.data!.id)`
    replaced with a typed `mutate(id: string)` variable. The render
    captures the id as a non-nullable local snapshot, so the click
    closure doesn't have to re-narrow `goal.data` across the lambda
    boundary.
- **Fixed a convoluted conditional-type cast** in
  `app/(tabs)/more/devices.tsx`: the disconnect mutation was
  laundering the cache through
  `cur as ReturnType<typeof listDevices> extends Promise<infer U> ? U : never`
  to recover the `ConnectedDevice[]` type. Replaced with a simple
  `setQueryData<ConnectedDevice[]>(["devices"], (cur) => ...)`
  — the same type, twelve characters instead of seventy.
- **Dropped a redundant cast** in `app/(tabs)/more/profile.tsx`: the
  `sessionStore` selector already returns `SessionUser | null`, so
  the `as SessionUser | null` was just decorative.
- **Validated URL-param enums before casting.** `verify.tsx` and
  `forgot-password.tsx` were doing
  `(params.purpose as OtpPurpose) ?? "signup"` /
  `(params.step as Step) ?? "request"`. A malformed deep link like
  `?purpose=evil` would propagate the bogus value straight to
  `requestOtp` and the backend would 422. Added small `parseOtpPurpose`
  + `parseStep` validators backed by a `Set` of known values; unknown
  values fall back to the safe default.
- **Audited but kept** the `as unknown as HCInsertModule` casts in
  `src/healthconnect/writeback.ts` (Phase 4 stretch, behind a runtime
  HC-availability guard) and the `Record<string, unknown>` parsing
  casts in `src/api/errors.ts` (legitimate runtime JSON narrowing
  with full per-field type checks).
- **New tests** at `__tests__/api/formdata.test.ts` (3 tests) and
  `__tests__/auth/url-param-validators.test.ts` (4 tests):
  - `appendFilePart` calls FormData.append with the verbatim
    `{ uri, name, type }` payload, preserves keys, supports multiple
    parts. Spy-backed so the test runs against either Node's
    polyfilled FormData or the RN one.
  - `parseOtpPurpose` and `parseStep` accept the known values, reject
    everything else (no silent cast on unknown / empty / undefined
    input), and are case-sensitive.
- 274 / 274 tests pass; `tsc --noEmit` clean; `expo-doctor` 17 / 17.

### Duplication / dead code / wrong-abstraction audit

- **`<PillGroup>`** — new component at
  `src/components/ui/PillGroup.tsx`. Collapses the rounded-pill,
  brand-when-active filter selector that period / metric / range
  pickers all needed: ~25 lines of inline JSX per use-case across 5
  screens (reports, trends, health dashboard, metric detail, PDF
  export — `trends.tsx` had it twice). Generic over `string | number`
  so day-range pickers (`7 | 30 | 90`) work alongside string-keyed
  ones. Renders each pill as a `radio` for accessibility, the wrapper
  as `radiogroup`.
- **`<SegmentGroup>`** — new component at
  `src/components/ui/SegmentGroup.tsx`. Same pattern but full-width
  ("tab strip" feel) for the 3 screens that needed it (preferences
  theme, preferences locale, reminders today/all). Each segment
  rendered as a `tab`, wrapper as `tablist`.
- **Refactored 6 screens** to use the new primitives. Net code
  removal: ~280 lines deleted, ~80 lines added. Cleaned up the now-unused
  `radius` / `Pressable` imports.
- **Dead code removed:**
  - `src/components/ui/Skeleton.tsx` (60 lines) — `Skeleton` and
    `SkeletonRow` exported but imported by zero screens.
  - `src/components/ui/index.ts` (12 lines) — barrel never imported;
    every consumer used the deep path `from "@/components/ui/Button"`.
  - `src/components/states/index.ts` (4 lines) — same dead barrel.
  - `patchRowInPages` + `removeRowFromPages` from
    `src/api/pagination.ts` (35 lines) — unused helpers, only their
    own tests referenced them. Their tests were also removed (kept the
    `flattenPages` and `offsetGetNextPageParam` tests that lock down
    actively-used code).
- **New tests** at `__tests__/components/PillGroup.test.tsx` (4
  tests) and `__tests__/components/SegmentGroup.test.tsx` (2 tests).
  Cover: render-and-press for each option, accessibility-state for
  the selected entry, numeric-value support (PillGroup only),
  re-tapping the selected option still notifies the consumer (no
  silent suppression).
- 267 / 267 tests pass; `tsc --noEmit` clean; `expo-doctor` 17 / 17.
- Documented stubs LEFT in place (intentional future work, not dead):
  `src/healthconnect/writeback.ts` (HC write-back, Phase 4 stretch),
  `src/healthconnect/backgroundSync.ts` (WorkManager-driven sync,
  Phase 4 stretch). Both have rich top-of-file docs explaining what
  needs to ship before they go live.



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
