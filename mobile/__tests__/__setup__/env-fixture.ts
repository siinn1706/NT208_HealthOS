/**
 * Jest setup: stub the Expo / RN native modules that throw at load time when
 * required from a Node test environment. This is the smallest set the suite
 * actually depends on — add new mocks here as new modules pull in the test
 * graph rather than scattering jest.mock() calls across test files.
 */

// 1. expo-constants — env.ts reads expoConfig.extra at module load and throws
// if any required key is missing (validates URL schemes too).
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        coreApiUrl: "http://10.0.2.2:8000",
        coreWsUrl: "ws://10.0.2.2:8000",
        buildChannel: "dev",
        aiFeaturesEnabled: false,
      },
    },
  },
}));

// 2. AsyncStorage — preferences/cache.ts reads it synchronously at import.
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      setItem: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        store.delete(k);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
    },
  };
});

// 3. SecureStore — session.ts uses it for the JWT.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    deleteItemAsync: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  };
});

// 4. expo-localization — i18n provider reads device locale at boot.
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", regionCode: "US" }],
}));

// 5. The community date-time picker renders a native UI; in tests it can be
// a no-op view so the JSX still mounts.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "datetime-picker", ...props }),
  };
});
