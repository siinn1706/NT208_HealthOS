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
    versionCode: 1,
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
    ],
    // "resize" lets the system shrink the visible viewport when the soft
    // keyboard appears, so flex layouts (composer + scrollable content)
    // naturally lift above it. "pan" leaves the layout fixed and pushed up
    // by an opaque area, which hid the chat composer + mid-form buttons.
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
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to log meals.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos for meal logging and avatars.",
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
