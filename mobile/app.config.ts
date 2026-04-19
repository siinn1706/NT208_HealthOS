import type { ExpoConfig, ConfigContext } from "expo/config";

type BuildChannel = "dev" | "staging" | "prod";

const channel: BuildChannel =
  (process.env.EXPO_PUBLIC_BUILD_CHANNEL as BuildChannel | undefined) ?? "dev";

const bundleIdByChannel: Record<BuildChannel, string> = {
  dev: "com.healthos.app.dev",
  staging: "com.healthos.app.staging",
  prod: "com.healthos.app",
};

const nameByChannel: Record<BuildChannel, string> = {
  dev: "HealthOS Dev",
  staging: "HealthOS Staging",
  prod: "HealthOS",
};

/**
 * Play Store requires a strictly-monotonic integer versionCode for every
 * release upload. We honor (in order):
 *   1. `ANDROID_VERSION_CODE` — explicit per-release override (CI sets this
 *      from a SemVer-derived counter, e.g. `git rev-list --count HEAD`).
 *   2. `EAS_BUILD_NUMBER` — auto-incremented by EAS Build when
 *      `eas.json:cli.appVersionSource = "remote"` is configured.
 *   3. `1` — the literal default for first-time / local prebuilds.
 * Bumping in CI prevents a developer from accidentally shipping a build
 * with a duplicate versionCode (which Play Console rejects).
 */
function resolveVersionCode(): number {
  const explicit = process.env.ANDROID_VERSION_CODE;
  const fromEas = process.env.EAS_BUILD_NUMBER;
  const raw = explicit ?? fromEas;
  if (raw && /^\d+$/.test(raw)) return parseInt(raw, 10);
  return 1;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: nameByChannel[channel],
  slug: "healthos-mobile",
  scheme: "healthos",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icons/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  runtimeVersion: { policy: "appVersion" },
  splash: {
    image: "./assets/splash/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0E7C66",
  },
  assetBundlePatterns: ["**/*"],
  android: {
    package: bundleIdByChannel[channel],
    versionCode: resolveVersionCode(),
    adaptiveIcon: {
      foregroundImage: "./assets/icons/adaptive-foreground.png",
      backgroundColor: "#0E7C66",
      monochromeImage: "./assets/icons/adaptive-monochrome.png",
    },
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CAMERA",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "android.permission.VIBRATE",
      // Health Connect — MVP read-only set (Phase 1: Steps + HeartRate;
      // Phase 2 adds Sleep + Weight). Permissions are also re-requested at
      // runtime by the SDK; declaring them here keeps the manifest in sync
      // so Play Store review can verify what we ask for.
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_HEART_RATE",
      "android.permission.health.READ_SLEEP",
      "android.permission.health.READ_WEIGHT",
      // Phase 4 stretch — Blood Pressure read access. Exercise sessions
      // are intentionally NOT requested yet (see types.ts for why).
      "android.permission.health.READ_BLOOD_PRESSURE",
      // Phase 4 stretch — write-back lets HealthOS push manual entries
      // back into Health Connect so the user's other apps can see them.
      "android.permission.health.WRITE_STEPS",
      "android.permission.health.WRITE_HEART_RATE",
      "android.permission.health.WRITE_WEIGHT",
      "android.permission.health.WRITE_BLOOD_PRESSURE",
    ],
    // The previous `intentFilters` entry tried to declare the Health
    // Connect rationale action manually. Expo's intent-filter normalizer
    // assumes every action / category starts with `android.intent.action.`
    // / `android.intent.category.` and prepends those prefixes silently —
    // which mangled `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`
    // into a non-functional action name and broke the consent flow. The
    // `react-native-health-connect` config plugin (in `plugins:` below)
    // adds the same intent-filter via withAndroidManifest, where the
    // values land verbatim. Keep this empty so we don't reintroduce the
    // mangling.
    softwareKeyboardLayoutMode: "resize",
  },
  ios: {
    bundleIdentifier: bundleIdByChannel[channel],
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    "expo-asset",
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow $(PRODUCT_NAME) to access your camera to log meals.",
        // We never record video in the app — only still photos for meals
        // and avatars. Without `recordAudioAndroid: false`, expo-camera
        // silently adds RECORD_AUDIO to the AndroidManifest, which Play
        // Store reviewers flag as needing justification (and TalkBack
        // reads it as scary on first launch).
        recordAudioAndroid: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow $(PRODUCT_NAME) to access your photos for meal logging and avatars.",
        // expo-image-picker also adds RECORD_AUDIO by default (used for
        // its video-picker mode). We don't pick videos.
        microphonePermission: false,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icons/notification-icon.png",
        color: "#0E7C66",
      },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission: "Use Face ID to quickly re-authenticate.",
      },
    ],
    // Adds the rationale `<intent-filter>` for Health Connect's consent
    // dialog. Replaces the manual `android.intentFilters` entry, which
    // Expo's normalizer mangled (see comment in `android` block above).
    "react-native-health-connect",
    // Local plugin — see `./plugins/withAndroidHardening.js` for the full
    // rationale. Adds <queries> for Health Connect package visibility,
    // marks camera <uses-feature> as optional so cameraless tablets are
    // not filtered out of Play Store, and disables auto-backup so we
    // don't ship user data to Google Drive without consent.
    "./plugins/withAndroidHardening.js",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    coreApiUrl:
      process.env.EXPO_PUBLIC_CORE_API_URL ?? "http://10.0.2.2:8000",
    coreWsUrl:
      process.env.EXPO_PUBLIC_CORE_WS_URL ?? "ws://10.0.2.2:8000",
    buildChannel: channel,
    aiFeaturesEnabled:
      (process.env.EXPO_PUBLIC_AI_FEATURES_ENABLED ?? "false") === "true",
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "",
    },
  },
});
