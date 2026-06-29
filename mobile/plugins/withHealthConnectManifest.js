const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Adds the <queries> block required for Health Connect (Android 11+ package visibility).
 * The react-native-health-connect app.plugin.js only adds the intent-filter;
 * the queries entry must be added separately at the manifest root level.
 */
const withHealthConnectManifest = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    if (!Array.isArray(manifest.queries)) {
      manifest.queries = [];
    }

    const alreadyPresent = manifest.queries.some(
      (q) =>
        Array.isArray(q.package) &&
        q.package.some((p) => p.$?.['android:name'] === 'com.google.android.apps.healthdata'),
    );

    if (!alreadyPresent) {
      manifest.queries.push({
        package: [{ $: { 'android:name': 'com.google.android.apps.healthdata' } }],
      });
    }

    return modConfig;
  });
};

module.exports = withHealthConnectManifest;
