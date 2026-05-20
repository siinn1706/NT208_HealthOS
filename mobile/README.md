# NT208 HealthOS — Mobile

Expo / React Native app recreating the NT208 HealthOS handoff across 3 visual themes (Calm Clinic · Night Sky · Warm Care) with tab screens plus auth, drill-down, care-flow, meds-flow, and reusable form routes.

## Scope

**This is an iOS/Android mobile app only.** There is no web target.

- No `expo start --web`, no web bundles, no `app.json` web block.
- `@react-native-community/netinfo`, `expo-haptics`, and other native modules are not web-compatible by design.
- For the web dashboard see `../frontend/`.

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

Set backend URLs with environment variables so physical devices can reach Core BE:

```bash
EXPO_PUBLIC_CORE_API_URL=http://192.168.1.10:8000
EXPO_PUBLIC_CORE_WS_URL=ws://192.168.1.10:8000
```

Use your LAN IP for phones on the same network. For Android emulator, prefer `10.0.2.2` instead of `localhost`. See [`mobile/.env.example`](./.env.example).

## Themes

Switch via **Me → Preferences → Appearance**:
- **Calm Clinic** — light (default for light system)
- **Night Sky** — dark (default for dark system)
- **Warm Care** — manual opt-in

## Stack

- Expo SDK 53 · React Native 0.79 · Expo Router v5
- react-native-reanimated v3 · react-native-svg · expo-blur
- lucide-react-native · @expo-google-fonts/inter
- Mobile-native Core API client under `src/api/`
- Bearer session storage via `expo-secure-store`
- Backend gaps are guarded in-screen instead of backed by local mock fixtures
