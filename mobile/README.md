# NT208 HealthOS — Mobile

Expo / React Native app for the HealthOS iOS/Android experience. The app calls the shared Next.js BFF with bearer tokens stored on-device; browser web traffic is handled separately by `../frontend/`.

## Scope

**This is an iOS/Android mobile app only.** There is no web target.

- No `expo start --web`, no web bundles, no `app.json` web block.
- `@react-native-community/netinfo`, `expo-haptics`, and other native modules are not web-compatible by design.
- For the web dashboard and BFF, see `../frontend/`.

## Screens

### Core tabs
| Route | Screen |
|---|---|
| `/(tabs)/home` | Home — health score, KPIs, next-up, AI insight, vitals, quick actions |
| `/(tabs)/care` | Appointments — week strip, segmented tabs, hero appointment card |
| `/(tabs)/chat` | Chat — AI assistant hero, conversation list |
| `/chat/[id]`  | AI Conversation — chat thread, typing animation, composer |
| `/(tabs)/meds` | Medications — adherence ring, dose timeline, medication actions |
| `/(tabs)/me`   | Profile — identity, stats, emergency card, menu groups, theme picker |

### Added flows
- `/auth/welcome`, `/auth/sign-in`, `/auth/sign-up`, `/auth/otp`, `/auth/setup`
- `/home/vitals`, `/home/score`, `/home/today`, `/home/quick-action`, `/home/insight/[id]`
- `/care/appointment/[id]`, `/care/video/[id]`, `/care/prep/[id]`, `/care/history`
- `/meds/add`, `/meds/edit/[id]`, `/meds/import`, `/meds/[id]`, `/meds/refill/[id]`, `/meds/pause/[id]`, `/meds/archive`, `/meds/history`
- `/forms/intake`, `/forms/symptoms`, `/forms/medication`, `/forms/insurance`

## Running locally

```bash
cd mobile
npm install
npx expo start
```

Open in Expo Go (iOS/Android) or press `i` / `a` for simulators.
Use `npm run android` to start Expo and open Android. The command checks ADB
first, closes stale offline emulator transports, cold-boots the selected Android
emulator without reusing a broken Quick Boot snapshot when recovering from that
state, waits until ADB and the emulator console are ready, and skips Expo's
online dependency-validation fetch so local startup still works without access
to the Expo versions endpoint. When online, run
`npm run check:expo-deps` to review SDK-compatible package versions.

Health Connect native sync cannot be signed off from Expo Go. Use the native
Android path before release or when validating `/profile/devices` sync:

```powershell
npm run android:native
```

This command first verifies Android native readiness, selects a JDK with
`javac` (Android Studio JBR is used when `JAVA_HOME` is blank), runs the same
ADB/emulator preflight, then builds and installs the native Android app with
`expo run:android` so the Health Connect modules and Android permissions
declared in `app.json` are present. Expo Go remains valid for general UI/API
smoke only.

Optional Android startup knobs:

```powershell
$env:ANDROID_AVD_NAME="Pixel_8"                 # override first installed AVD
$env:ANDROID_EMULATOR_BOOT_WAIT_MS="240000"     # slow first boot, default 180000
$env:ADB_PATH="C:\Users\<you>\AppData\Local\Android\Sdk\platform-tools\adb.exe"
```

For emulator-only local development, mobile backend and BFF URLs can stay blank;
the Android emulator may still use `10.0.2.2` fallback URLs. For a physical
Android phone, `npm run android` requires explicit public URLs before Metro
starts because blank values can fall back to emulator-only `10.0.2.2` when Expo
LAN metadata is unavailable.

Set physical-device URLs to this computer's LAN IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
EXPO_PUBLIC_WS_URL=ws://192.168.1.10:8000
EXPO_PUBLIC_WEB_APP_URL=http://192.168.1.10:3000
```
`EXPO_PUBLIC_CORE_API_URL` is still accepted as legacy fallback until 2026-09-01, but `EXPO_PUBLIC_API_URL` is the canonical variable. The API URL must point at the BFF gateway, never directly at Core port 8000.

Use your LAN IP for phones on the same network and start Core so it listens on
the LAN interface. Start the Next.js frontend/BFF on the same host before using
Google or GitHub sign-in from mobile.

```powershell
..\start_BE.bat -Host 0.0.0.0
```

For Android emulator, a blank local env still falls back to `10.0.2.2` when no
LAN host is available. Do not keep `10.0.2.2` in `mobile/.env` when testing on a
physical phone; it will override LAN auto-detection and the phone cannot reach
your computer through that emulator-only address. See
[`mobile/.env.example`](./.env.example). Production builds still require
HTTPS/WSS configuration.

If Android appears open but Expo cannot control it, verify `adb devices -l`.
Any `offline` emulator means ADB cannot install/open Expo Go; rerun
`npm run android` so the preflight can close the stale emulator and let Expo
start a clean one. If `adb start-server` reports `socketpair` or `WinError
10106`, repair the Windows network stack and reboot before retrying; that is a
machine-level ADB failure, not an Expo app failure.

### Testing Health Connect (wearables) locally

The `/profile/devices` Health Connect sync only runs in a native build
(`npm run android:native`) — never Expo Go — and needs a device that actually
has Health Connect plus some data to read. Checklist:

1. **Device/emulator with Health Connect.** Use a physical Android phone, or an
   **Android 14 (API 34) Google Play emulator** — Health Connect is built in
   there. Older or non-Google-Play images have no Health Connect provider, so the
   adapter reports it as unavailable instead of syncing.
2. **Seed some data first.** Health Connect starts empty on a fresh emulator, so
   a sync returns nothing (this is not a bug). Get records in via any of:
   - walk a few steps on a physical phone (its own step counter writes to HC),
   - install **Health Connect Toolbox** and inject Steps/HeartRate/Weight, or
   - connect Google Fit / Samsung Health and let it share into Health Connect.

   Real wearable data flows the same way: pair the watch in its vendor app
   (Garmin Connect, Mi Fitness, …) and enable that app's Health Connect sharing.
   The app never talks to the watch over Bluetooth — it only reads Health Connect.
3. **Run the in-app flow.** Profile → Devices → **Connect Health Connect** →
   pick data types → **Grant** (accept the system permission dialog) →
   **Sync now**. The adapter backfills the last 30 days, so previously stored
   records show up on the first sync, not just new deltas.
4. **Backend must be up.** Sync goes through the BFF, so start the Next.js
   frontend/BFF (see the env notes above) before connecting a device.

### Codex Run actions

Codex actions are wired inside this Expo app root:

```bash
./script/build_and_run.sh --help
./script/build_and_run.sh
./script/build_and_run.sh --android
```

On Windows/Codex actions, use the wrapper:

```powershell
.\script\build_and_run.cmd --help
.\script\build_and_run.cmd --android
.\script\build_and_run.cmd --android-native
```

- `Run` starts the Expo dev server in the foreground.
- `Run Android` uses the existing `npm run android` path, including ADB preflight.
- `Run Android Native` uses `npm run android:native`; use it for Health Connect smoke.
- No web target or web cloud build is configured for this mobile-only app.

### Android EAS build and submit

`eas.json` contains Android-only release profiles:

- `preview` builds an internal APK for tester devices.
- `production` builds a Google Play-ready AAB and auto-increments the checked-in Android `versionCode`.
- `submit.production.android.track` defaults to `internal`.

Before the first cloud build, the Expo project owner must run EAS init so Expo
creates the real project ID:

```powershell
npx eas-cli@latest init
```

This app also supports injecting the real project ID through
`EAS_PROJECT_ID`; `app.config.js` writes it to `extra.eas.projectId` during
Expo/EAS config resolution. This keeps the repo free of placeholder project IDs
while still allowing local and cloud release checks:

```powershell
$env:EAS_PROJECT_ID="<expo-project-uuid>"
npm run check:expo-config
npm run check:release-env
```

Production builds also need public HTTPS/WSS runtime URLs configured through
EAS environment variables or a release `.env` that is not committed:

```text
EXPO_PUBLIC_API_URL=https://healthos.shop
EXPO_PUBLIC_WS_URL=wss://healthos.shop
EXPO_PUBLIC_WEB_APP_URL=https://healthos.io.vn
EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI=https://healthos.io.vn/auth/oauth/mobile-callback
```

This repo uses EAS local app versioning, so `app.json` starts Android at
`versionCode: 1`. Commit every EAS `versionCode` bump before the next Google
Play build. If the project later switches to remote versioning, run the EAS
version setup command with the Expo project owner and update `eas.json` in the
same change.

Build Android binaries from this `mobile/` directory:

```powershell
npx eas-cli@latest build --platform android --profile preview
npm run build:android:production
```

Use `npm run build:android:production` for production builds so the strict
release env gate runs before EAS starts.

Submit the latest production Android build after the Google Play app, package
name, first manual upload, and service account access are configured:

```powershell
npx eas-cli@latest submit --platform android --profile production --latest
```

Do not commit Google service account JSON, keystores, upload keys, or release
environment files.

### Android App Links for OAuth

Local OAuth keeps using `nt208://auth/oauth/callback`. Production Android builds
should set `EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI` to an HTTPS App Link on the
web/BFF host. `app.config.js` then emits an Android `autoVerify` intent filter
for that host and path.

The frontend/BFF must allow the same URI and serve Digital Asset Links:

```text
MOBILE_OAUTH_REDIRECT_URIS=nt208://auth/oauth/callback,https://app.example.com/auth/oauth/mobile-callback
ANDROID_APP_LINK_PACKAGE_NAME=com.nt208.healthos
ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS=AA:BB:...:FF
```

Get the SHA-256 fingerprint from the Play/App signing certificate or upload
certificate that signs the installed Android build. The value belongs in deploy
env/EAS secrets, not git.

### Product readiness checks

```powershell
npm run check:logo-parity
npm run check:expo-config
npm run check:release-env
npm run check:routes
npm run check:android-native-readiness
```

`check:logo-parity` keeps the in-app mobile brand mark aligned with
`../frontend/public/logo.svg` and verifies the launcher/splash asset dimensions
referenced by Expo config.
`check:android-native-readiness` verifies a usable JDK, Android SDK tools,
static Expo Android metadata, and Android EAS preview/production profiles
without starting Metro, launching an emulator, or submitting a cloud build.

## Themes

Switch via **Me → Preferences → Appearance**:
- **Calm Clinic** — light (default for light system)
- **Night Sky** — dark (default for dark system)
- **Warm Care** — manual opt-in

## Stack

- Expo SDK 54 · React Native 0.81 · Expo Router v6
- react-native-reanimated v4 · react-native-svg · expo-blur
- lucide-react-native · @expo-google-fonts/inter
- Mobile-native Core API client under `src/api/`
- Bearer session storage via `expo-secure-store`
- Backend gaps are guarded in-screen instead of backed by local mock fixtures

## Dev Notes

### Jest / testing dependencies

`react-test-renderer@19.1.0` is a required devDependency because
`@testing-library/react-native` declares `react-test-renderer>=18.2.0` as a peer dep.
It must be pinned to match `react@19.1.0` exactly — using a mismatched version causes
runtime errors in tests.

## Shared API contracts

Mobile imports Core API types from `../shared/api-contracts`. `metro.config.js` watches the repository root and resolves modules from `mobile/node_modules` first, so Expo can bundle those shared TypeScript files without copying them into `mobile/src`. `tsconfig.json` includes `../shared/**/*.ts` so strict type-checking sees the same contract source Metro bundles.
