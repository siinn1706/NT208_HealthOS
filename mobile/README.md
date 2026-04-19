# HealthOS Mobile (Android-first)

A native Android app for NT208_HealthOS built with **Expo SDK 52 + React Native + TypeScript + Expo Router**. The app talks **directly to the FastAPI Core BE on `/v1`** — there is no Next.js BFF in the runtime path.

> Backend audit, scope, blocked features, and execution phases live in [.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md](../.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md).

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20.x (matches the repo's [.nvmrc](../.nvmrc)) |
| npm | 10.x |
| JDK | 17 (required by EAS Build / Gradle) |
| Android SDK + emulator | API 33+ recommended |
| Expo CLI | bundled with `npx expo` |
| EAS CLI | `npm i -g eas-cli` (only needed for cloud builds) |
| Python | 3.12 (only for placeholder asset generation) |

---

## Install

```powershell
cd mobile
npm install
```

Optional placeholder assets (already generated, regenerate after editing the script):

```powershell
python scripts/generate-placeholder-assets.py
```

---

## Environment

Configuration is read from `app.config.ts` `extra` field, which reads from `EXPO_PUBLIC_*` env vars. You can use `.env.development` (gitignored) for local overrides.

| Var | Required | Default | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_CORE_API_URL` | yes | `http://10.0.2.2:8000` | `10.0.2.2` is the Android emulator's loopback to the host. Use your LAN IP for a real device, e.g. `http://192.168.1.42:8000`. |
| `EXPO_PUBLIC_CORE_WS_URL` | yes | `ws://10.0.2.2:8000` | Match scheme: `ws://` for dev, `wss://` for staging/prod. |
| `EXPO_PUBLIC_BUILD_CHANNEL` | no | `dev` | `dev` / `staging` / `prod`. Drives bundle id and app name. |
| `EXPO_PUBLIC_AI_FEATURES_ENABLED` | no | `false` | Hidden behind a flag because the Core BE does not yet generate AI replies in product chat. |

Copy the example file:

```powershell
Copy-Item .env.example .env.development
```

---

## Run

### Android emulator (recommended for daily dev)

In one terminal, start Core BE per the repo root README:

```powershell
.\start_BE.bat
```

In another terminal:

```powershell
cd mobile
npm run start
```

Press `a` in the Metro UI to launch the Android emulator. If the app can't reach Core BE:

```powershell
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8001 tcp:8001
```

This makes `localhost:8000` on the emulator point to your host, so the default `http://10.0.2.2:8000` works without changing env.

### Real Android device over USB

1. Enable Developer Mode + USB debugging on the device.
2. Plug it in, accept the RSA prompt.
3. Update `EXPO_PUBLIC_CORE_API_URL` to your host's LAN IP (e.g. `http://192.168.1.42:8000`).
4. Make sure Core BE is bound to all interfaces (`uvicorn --host 0.0.0.0 ...`) and that your firewall allows port 8000.
5. `npm run start` then press `a`.

### Expo Go (no native build)

Works in early phases (M1-M3) until you exercise camera, secure store, or notifications. After that, use a development build:

```powershell
npx expo prebuild --platform android
npm run android
```

---

## Build a testable APK

### Cloud (EAS Build) - preferred for sharing

```powershell
npx eas login
npx eas build:configure
npx eas build --platform android --profile preview
```

EAS returns a download link. The `preview` profile produces an APK with the staging env baked in.

### Local Gradle build

```powershell
npx expo prebuild --platform android
cd android
.\gradlew assembleRelease
# APK at android\app\build\outputs\apk\release\app-release.apk
```

For a debug APK you can sideload quickly:

```powershell
.\gradlew assembleDebug
# APK at android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Project structure

```
mobile/
  app/                      Expo Router routes
    (auth)/                 login, register, verify, forgot-password, mfa-challenge
    (onboarding)/           [step].tsx (7-step wizard)
    (tabs)/                 home, health, meals, chat, more
  src/
    api/                    fetch client, error normalizer, endpoint modules, ws client
    auth/                   SecureStore session + AuthProvider + biometric helper
    components/             ui primitives, state primitives, charts
    config/                 env + feature flags
    hooks/                  network status hook
    i18n/                   en + vi locale files + I18nProvider
    notifications/          expo-notifications scheduler + permissions
    theme/                  tokens, colors, ThemeProvider
    utils/                  date, debounce, throttle
  assets/                   icons + splash + fonts
  app.config.ts             Bundle id, plugins, env extras (per channel)
  eas.json                  development / preview / production profiles
```

---

## Architecture in one paragraph

Auth uses Bearer JWT in `expo-secure-store`. Every API call goes through `src/api/client.ts`, which normalizes FastAPI `detail` shapes into a typed `ApiError` (mirrors [frontend/src/lib/core-api-proxy.ts](../frontend/src/lib/core-api-proxy.ts)). Server state is owned by TanStack Query v5. WebSocket auth is a short-lived `ws_ticket` from `GET /v1/auth/ws-ticket` appended as `?token=` to `${EXPO_PUBLIC_CORE_WS_URL}/ws`. The chat client dedupes the server's dual-broadcast envelopes by `server_message_id` and falls back to REST `POST .../messages` when the socket is not open. Reminders fire via `expo-notifications` because the Core BE has no scheduler — see "Blocked features" below.

---

## Blocked features (do not implement on mobile until backend ships)

| Feature | Reason | Workaround |
|---|---|---|
| OAuth (Google, GitHub) | `POST /v1/auth/token` is gated by `X-BFF-Secret` (BFF-only) | Email + OTP only on mobile. |
| FCM/APNs push | No device-token endpoint exists in Core | Local notifications scheduled by `src/notifications/scheduler.ts`. |
| AI assistant replies in product chat | `chat_service.send_message` does not invoke AI worker | Hidden behind `EXPO_PUBLIC_AI_FEATURES_ENABLED=false`. |
| Chat image attachments | BFF stub returns 501; no Core upload route for chat | Attach button is hidden in `app/(tabs)/chat/[conversationId].tsx`. |
| Edit appointment fields | Only `GET` + `POST` exist for fields; status PATCH does exist | Cancel + mark-complete buttons wired via `PATCH /v1/appointments/{id}/status`. Field edits still unsupported by Core. |
| Account export | Wired via `POST /v1/users/me/export` (202) → poll `GET /v1/users/me/export/{id}` → `GET .../{id}/download` opened with `expo-linking`. **Settings → Security → Export account data**. Backend rate-limits 1/24h. |
| Account delete | Wired via `DELETE /v1/users/me` with `{ confirmation_email, password? }` body, soft-delete with 30-day grace. **Settings → Security → Delete account**. Restore endpoint (`POST /v1/users/me/restore`) is exposed in `src/api/endpoints/account.ts` but not yet wired to UI — needs backend to expose `deleted_at` on `CurrentUser` so we can detect the grace state. |
| `GET /v1/meals/calories-summary` | Backend route ordering bug + missing imports | Mobile aggregates client-side from `listMeals` (see `app/(tabs)/meals/index.tsx`). |
| Achievements / gamification | Web BFF synthesizes a fake payload | Skipped in MVP. |
| Refresh token | No `/auth/refresh` endpoint | App detects 401 -> `auth:expired` event -> logout-to-login. With biometric setting on, the app can offer a one-tap re-login. |

---

## Manual QA checklist

Run before tagging an APK for distribution.

- [ ] Install fresh APK, sign up via OTP, complete the 7-step onboarding.
- [ ] Toggle MFA on -> log out -> log back in -> verify TOTP challenge.
- [ ] Verify 1 recovery code consumes correctly when used in the challenge screen.
- [ ] Snap a meal photo -> meal detail polls until status flips to `analyzed` (or `failed`).
- [ ] Create a daily reminder -> kill the app -> notification fires at the scheduled time.
- [ ] Disconnect WiFi mid-chat -> messages send via REST when WiFi returns -> WS reconnects.
- [ ] Background the app for 5+ minutes -> resume -> WS reconnects without restart.
- [ ] Force JWT expiry (set `access_token_expire_minutes=1` in backend, sign in, wait) -> 401 surfaces a logout flow.
- [ ] Toggle theme + accent color -> persists across cold start.
- [ ] Connect a wearable provider -> "Last connected at..." shows correct timestamp; copy makes clear sync is timestamp-only today.
- [ ] Open Reports for 7d / 30d / 90d -> JSON renders gracefully when sections are empty.

Device coverage priority: Pixel 6/7 (Android 14) -> Samsung Galaxy A series (Android 13) -> small-screen Android 12 phone.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Network request failed` on every call | Emulator can't reach host | Run `adb reverse tcp:8000 tcp:8000` and confirm Core BE is up. |
| `AUTH_REQUIRED` immediately after login | SecureStore wasn't writeable | Check the app has `expo-secure-store` plugin in `app.config.ts` and re-prebuild. |
| WS shows "Reconnecting..." forever | `EXPO_PUBLIC_CORE_WS_URL` scheme mismatch | Use `ws://` for HTTP, `wss://` for HTTPS. |
| OTP stuck "Sending..." in dev | Core BE is rate limiting (5/min/IP) | Wait 60s or restart Redis. |
| Photos fail with 413 | Pre-resize step skipped | Check `expo-image-manipulator` resize is set to `width: 1600` in `app/(tabs)/meals/snap.tsx`. |
| Build fails on `gradlew` | JDK version | Install JDK 17 (`java -version` should print 17). |

---

## Backend route quick reference

| Group | Mobile-usable | Notes |
|---|---|---|
| `/v1/auth/*` | yes | `POST /v1/auth/token` is BFF-only (X-BFF-Secret). |
| `/v1/users/me`, `/v1/users/me/avatar`, `/v1/users/lookup` | yes | |
| `/v1/preferences/me` | yes | |
| `/v1/mfa/*` | yes | |
| `/v1/security-logs/` | yes | trailing slash matters |
| `/v1/dashboard/summary` | yes | single bundle |
| `/v1/vitals/timeseries?days=N` | yes | HR + BP only |
| `/v1/health-metrics/*` | yes | POST returns bare DTO (not wrapped in `{ data }`) |
| `/v1/health/risk-predictions` | yes | sync; POST is identical to GET |
| `/v1/health-goals`, `/v1/goals/progress` | yes | single goal |
| `/v1/reports`, `/v1/reports/trends` | yes | JSON only, no PDF |
| `/v1/nutrition/suggestions` | yes | |
| `/v1/devices*` | yes | sync only updates timestamp |
| `/v1/appointments` | partial | GET + POST + PATCH `/{id}/status` (cancel/complete). No field edits. |
| `/v1/reminders*` | yes | Server has no scheduler — mobile fires locally. Occurrence model (snooze/skip/done) wired via `/reminders/occurrences` and `/reminders/{id}/{snooze\|skip\|done}`. |
| `/v1/reports*` | yes | JSON read + trends + async PDF export (`POST /export-pdf` → poll → signed URL). |
| `/v1/meals*` | yes | `calories-summary` is suspect, see workaround above |
| `/v1/conversations*` | yes | cursor pagination by `before` ISO timestamp |
| `WS /ws?token=<ticket>` | yes | NOT under `/v1`; use `GET /v1/auth/ws-ticket` to mint a ticket |
| `WS /ws/chat/{user_id}` | **DO NOT USE** | unauthenticated demo socket in [chat.py](../backend/app/api/v1/endpoints/chat.py) |

---

## Testing

```powershell
npm run typecheck
npm run lint
npm run test
```

Test setup uses `jest-expo`. Add tests under `__tests__/` adjacent to the file under test or in a top-level `__tests__/` folder.

---

## Releasing

### Versioning

1. Bump `version` in `app.config.ts` (semver string).
2. Bump `versionCode` in the Android section (must be a strictly-increasing integer for every Play Store submission).
3. Tag the release once the AAB is uploaded.

### Build artefacts

- `npx eas build --platform android --profile preview` → installable APK link for internal testers.
- `npx eas build --platform android --profile production` → AAB for Play Console upload.

### Signing strategy

- **EAS-managed credentials (recommended for student capstone).** Run `npx eas credentials` once per project; EAS generates and stores an upload keystore in their managed credential store. Subsequent `eas build` runs reuse it transparently. There is nothing to commit to the repo.
- **Self-managed keystore.** If the team needs control:
  1. `keytool -genkeypair -v -keystore upload-keystore.jks -alias healthos-upload -keyalg RSA -keysize 2048 -validity 10000`.
  2. Store the keystore + passwords in 1Password / Bitwarden under the team account. Never commit them.
  3. Reference via `EAS_LOCAL_BUILD_*` env vars or `eas credentials --local`.
- **Debug builds** are signed with the universal Android debug keystore — fine for emulator + sideload, not acceptable for distribution.
- **Play App Signing.** When uploading the first AAB, accept Play App Signing so Google rotates the actual app-signing key in their HSM and the upload keystore is the only thing the team manages long-term.

### Distribution

- Internal testers: share the EAS Build APK URL directly. Install via "Install from unknown sources" prompt on the test device.
- Play Console internal testing track: upload the AAB once, invite up to 100 testers by email; eligibility is automatic once they accept.
- Closed/open beta tracks become available once a privacy policy URL is published in Play Console.

---

## Where to get help

- Backend route source of truth: [backend/app/api/v1/router.py](../backend/app/api/v1/router.py).
- Web feature parity reference (NOT a runtime dependency): [frontend/src/app/[locale]/(app)/](../frontend/src/app/%5Blocale%5D/(app)/).
- Plan with full repo audit: [.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md](../.cursor/plans/healthos_android_mobile_mvp_38ae9137.plan.md).
