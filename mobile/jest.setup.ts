/* eslint-env jest */
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', regionCode: 'US', currencyCode: 'USD', textDirection: 'ltr' as const }],
  locale: 'en-US',
  locales: ['en-US'],
  timezone: 'America/New_York',
  isoCurrencyCodes: ['USD'],
  region: 'US',
  isRTL: false,
}));

// Global react-i18next mock — resolves keys against the real EN translation JSON so
// test assertions can use human-readable strings without booting the i18n runtime.
// The factory must be self-contained (jest.mock is hoisted) so we use require() inside it.
jest.mock('react-i18next', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mockEnJson = require('./src/i18n/locales/en.json') as Record<string, unknown>;
  function mockResolveKey(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let node: unknown = mockEnJson;
    for (const part of parts) {
      node = (node as Record<string, unknown>)?.[part];
    }
    if (typeof node !== 'string') return key;
    if (!params) return node;
    return node.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`,
    );
  }
  return {
    useTranslation: () => ({
      t: mockResolveKey,
      i18n: { language: 'en', changeLanguage: jest.fn() },
    }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
    Trans: ({ children }: { children: React.ReactNode }) => children,
  };
});
