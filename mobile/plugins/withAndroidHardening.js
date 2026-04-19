/**
 * Local Expo config plugin that fills three Android-manifest gaps the
 * standard `app.config.ts` JSON schema cannot express:
 *
 *   1. `<queries><package android:name="com.google.android.apps.healthdata" />`
 *      — required for Android 11+ (API 30+) package visibility so that
 *      `react-native-health-connect`'s availability check can see the
 *      Health Connect APK at all. Without this, every device on Android
 *      11+ reports "Health Connect not installed" even when it is, and
 *      the in-app HC settings flow is dead on arrival.
 *      Reference: https://developer.android.com/training/health-connect/get-started
 *
 *   2. `<uses-feature android:name="android.hardware.camera"
 *      android:required="false" />` — `expo-camera` declares CAMERA
 *      permission, which Play Store automatically translates into a
 *      hard-required `<uses-feature>` if you don't explicitly soften it.
 *      That filters out cameraless tablets / foldables / Chromebooks
 *      from Play Store visibility — undesirable for a health app.
 *      Same reasoning for `camera.autofocus` and `camera.front`.
 *      Reference: https://developer.android.com/guide/topics/manifest/uses-feature-element#permissions
 *
 *   3. `android:allowBackup="false"` — belt-and-suspenders alongside
 *      `expo-secure-store`'s targeted backup-exclusion rules. Even
 *      though SecureStore data is excluded by `secure_store_backup_rules`,
 *      we don't want AsyncStorage (preference cache, query persist
 *      blob), Notification preferences, or anything else auto-uploaded
 *      to the user's Google Drive without their explicit opt-in. Health
 *      data is sensitive — keep it on-device unless the user explicitly
 *      exports it through the in-app "Export account data" flow.
 */

const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
const CAMERA_FEATURES = [
  "android.hardware.camera",
  "android.hardware.camera.autofocus",
  "android.hardware.camera.front",
];
/**
 * Permissions that some upstream config plugin or Expo's `withAndroidBaseMods`
 * adds unconditionally and that we don't actually use:
 *   - SYSTEM_ALERT_WINDOW: only needed for the React Native dev menu
 *     overlay (debug builds). Keeping it in the release manifest gets
 *     us flagged by Play Store's "sensitive permissions" review.
 *   - READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE: legacy storage
 *     permissions only meaningful on API <33. expo-image-picker adds
 *     them with `maxSdkVersion=32`. We block them outright on devices
 *     where READ_MEDIA_IMAGES is the actual contract.
 *
 * `withBlockedPermissions` adds `tools:node="remove"` so the manifest
 * merger drops them from the final APK / AAB.
 */
const BLOCKED_PERMISSIONS = [
  "android.permission.SYSTEM_ALERT_WINDOW",
];

function ensureQueriesPackage(manifest, packageName) {
  manifest.queries = Array.isArray(manifest.queries) ? manifest.queries : [];
  if (manifest.queries.length === 0) {
    manifest.queries.push({});
  }
  const queriesNode = manifest.queries[0];
  queriesNode.package = Array.isArray(queriesNode.package)
    ? queriesNode.package
    : [];
  const already = queriesNode.package.some(
    (p) => p?.$?.["android:name"] === packageName
  );
  if (!already) {
    queriesNode.package.push({ $: { "android:name": packageName } });
  }
}

function ensureUsesFeatureOptional(manifest, featureName) {
  manifest["uses-feature"] = Array.isArray(manifest["uses-feature"])
    ? manifest["uses-feature"]
    : [];
  const existing = manifest["uses-feature"].find(
    (f) => f?.$?.["android:name"] === featureName
  );
  if (existing) {
    existing.$["android:required"] = "false";
    return;
  }
  manifest["uses-feature"].push({
    $: { "android:name": featureName, "android:required": "false" },
  });
}

const withAndroidHardening = (config) => {
  // Drop unused permissions BEFORE the manifest mod runs so the final
  // merge has consistent state regardless of plugin ordering.
  config = AndroidConfig.Permissions.withBlockedPermissions(
    config,
    BLOCKED_PERMISSIONS
  );

  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    ensureQueriesPackage(manifest, HEALTH_CONNECT_PACKAGE);
    for (const feature of CAMERA_FEATURES) {
      ensureUsesFeatureOptional(manifest, feature);
    }

    // android:allowBackup is on the <application> element. Expo's default
    // is "true"; flip it to "false" so AsyncStorage / cached data is not
    // included in Google Drive auto-backup. SecureStore already has its
    // own backup-exclusion XML rules from expo-secure-store, but those
    // only fire when allowBackup is true; setting allowBackup="false"
    // skips the auto-backup pipeline entirely, which is what we want for
    // a health app.
    if (Array.isArray(manifest.application) && manifest.application[0]) {
      manifest.application[0].$["android:allowBackup"] = "false";
    }

    return cfg;
  });
};

module.exports = withAndroidHardening;

// Exported for unit-testing in isolation. The full plugin chain runs at
// `expo prebuild` time and depends on a complete ExpoConfig graph; the
// helpers below take only the manifest object and are easy to verify.
module.exports.__test__ = {
  ensureQueriesPackage,
  ensureUsesFeatureOptional,
  HEALTH_CONNECT_PACKAGE,
  CAMERA_FEATURES,
  BLOCKED_PERMISSIONS,
};
