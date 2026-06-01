const { expo: staticConfig } = require('./app.json');

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function mergePlainObject(base, override) {
  return {
    ...(base || {}),
    ...(override || {}),
  };
}

function normalizeHttpsAppLinkUrl(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI must be an absolute URL.');
  }

  if (parsed.protocol === 'nt208:') {
    return null;
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI must use HTTPS for Android App Links.');
  }
  if (!parsed.hostname || parsed.port || parsed.username || parsed.password) {
    throw new Error('EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI must be a production HTTPS URL without port or credentials.');
  }

  parsed.search = '';
  parsed.hash = '';
  return parsed;
}

function createAndroidAppLinkIntentFilter() {
  const appLink = normalizeHttpsAppLinkUrl(readEnv('EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI'));
  if (!appLink) return null;

  return {
    action: 'VIEW',
    autoVerify: true,
    data: [
      {
        scheme: 'https',
        host: appLink.hostname,
        path: appLink.pathname || '/',
      },
    ],
    category: ['BROWSABLE', 'DEFAULT'],
  };
}

function createBaseConfig(config) {
  return {
    ...staticConfig,
    ...config,
    ios: mergePlainObject(staticConfig.ios, config.ios),
    android: mergePlainObject(staticConfig.android, config.android),
    splash: mergePlainObject(staticConfig.splash, config.splash),
    experiments: mergePlainObject(staticConfig.experiments, config.experiments),
    extra: mergePlainObject(staticConfig.extra, config.extra),
  };
}

function withAndroidAppLinks(config) {
  const intentFilter = createAndroidAppLinkIntentFilter();
  if (!intentFilter) return config;

  return {
    ...config,
    android: {
      ...(config.android || {}),
      intentFilters: [
        ...((config.android && config.android.intentFilters) || []),
        intentFilter,
      ],
    },
  };
}

function withEasProjectId(config) {
  const projectId = readEnv('EAS_PROJECT_ID');
  if (!projectId) return config;

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      eas: {
        ...((config.extra && config.extra.eas) || {}),
        projectId,
      },
    },
  };
}

module.exports = ({ config = {} } = {}) => withEasProjectId(withAndroidAppLinks(createBaseConfig(config)));
