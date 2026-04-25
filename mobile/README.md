# NT208 HealthOS — Mobile

Expo / React Native UI-only app recreating the NT208 HealthOS handoff across 3 visual themes (Calm Clinic · Night Sky · Warm Care) with tab screens plus auth, drill-down, care-flow, meds-flow, and reusable form routes.

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

### Added UI-only flows
- `/auth/welcome`, `/auth/sign-in`, `/auth/sign-up`, `/auth/otp`, `/auth/setup`
- `/home/vitals`, `/home/labs`, `/home/plan`, `/home/insight/[id]`
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

## Themes

Switch via **Me → Preferences → Appearance**:
- **Calm Clinic** — light (default for light system)
- **Night Sky** — dark (default for dark system)
- **Warm Care** — manual opt-in

## Stack

- Expo SDK 53 · React Native 0.79 · Expo Router v5
- react-native-reanimated v3 · react-native-svg · expo-blur
- lucide-react-native · @expo-google-fonts/inter
- No API calls — all screens use mock data from `src/mocks/`
