import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const createExpoConfig = require('../app.config.js');

const expectedProjectId = '00000000-0000-4000-8000-000000000000';
const previousEnv = {
  EAS_PROJECT_ID: process.env.EAS_PROJECT_ID,
  EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI,
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function restoreEnv() {
  Object.entries(previousEnv).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

try {
  delete process.env.EAS_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI;
  const defaultConfig = createExpoConfig({ config: {} });
  if (defaultConfig.slug !== 'nt208-healthos') {
    fail(`Expected Expo slug nt208-healthos, got ${String(defaultConfig.slug)}`);
  }
  if (defaultConfig.android?.package !== 'com.nt208.healthos') {
    fail(`Expected Android package com.nt208.healthos, got ${String(defaultConfig.android?.package)}`);
  }
  if (!defaultConfig.android?.permissions?.includes('android.permission.health.READ_STEPS')) {
    fail('Expected Health Connect Android permissions to be preserved.');
  }
  const pluginNames = (defaultConfig.plugins || []).map((plugin) => (
    Array.isArray(plugin) ? plugin[0] : plugin
  ));
  if (!pluginNames.includes('expo-router') || !pluginNames.includes('expo-health-connect')) {
    fail('Expected Expo Router and Health Connect plugins to be preserved.');
  }

  process.env.EAS_PROJECT_ID = expectedProjectId;
  const easConfig = createExpoConfig({ config: {} });
  if (easConfig.extra?.eas?.projectId !== expectedProjectId) {
    fail('EAS_PROJECT_ID was not written to extra.eas.projectId.');
  }

  process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI = 'https://app.example.com/auth/oauth/mobile-callback';
  const appLinksConfig = createExpoConfig({ config: {} });
  const appLinkFilter = appLinksConfig.android?.intentFilters?.find((filter) => (
    filter?.autoVerify === true
    && filter?.data?.[0]?.host === 'app.example.com'
    && filter?.data?.[0]?.path === '/auth/oauth/mobile-callback'
    && filter?.data?.[0]?.pathPrefix === undefined
  ));
  if (!appLinkFilter) {
    fail('Expected Android App Links intent filter for EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI.');
  }
  if (!appLinkFilter.category?.includes('BROWSABLE') || !appLinkFilter.category?.includes('DEFAULT')) {
    fail('Expected Android App Links intent filter to include BROWSABLE and DEFAULT categories.');
  }
} finally {
  restoreEnv();
}
