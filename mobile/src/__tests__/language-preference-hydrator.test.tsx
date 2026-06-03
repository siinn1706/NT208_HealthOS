/* eslint-env jest */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { LanguagePreferenceHydrator } from '../i18n/language-preference-hydrator';
import { useSession } from '../auth/session-provider';
import { useApiQuery } from '../api/query';
import { preferenceService } from '../api/services/preference-service';
import { queryKeys } from '../api/queryKeys';
import i18n from '../i18n';

jest.mock('../auth/session-provider', () => ({
  useSession: jest.fn(),
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services/preference-service', () => ({
  preferenceService: {
    me: jest.fn(),
  },
}));

jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    language: 'en',
    changeLanguage: jest.fn(),
  },
  initLocaleFromStorage: jest.fn().mockResolvedValue(undefined),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockChangeLanguage = i18n.changeLanguage as jest.MockedFunction<typeof i18n.changeLanguage>;

function queryState(locale: 'en' | 'vi' | null) {
  return {
    data: locale ? { theme_mode: 'system', accent_color: null, locale } : null,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  i18n.language = 'en';
  mockUseSession.mockReturnValue({
    user: { id: 'user-1', email: 'test@example.com' },
    booting: false,
    authenticated: true,
  } as never);
  mockUseApiQuery.mockReturnValue(queryState('vi') as never);
});

describe('LanguagePreferenceHydrator', () => {
  it('hydrates saved locale after the authenticated session boots', async () => {
    render(<LanguagePreferenceHydrator />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.preferences,
      expect.any(Function),
      { enabled: true },
    );
    await waitFor(() => expect(mockChangeLanguage).toHaveBeenCalledWith('vi'));
  });

  it('does not fetch preferences while unauthenticated', () => {
    mockUseSession.mockReturnValue({ user: null, booting: false, authenticated: false } as never);
    render(<LanguagePreferenceHydrator />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.preferences,
      expect.any(Function),
      { enabled: false },
    );
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it('does not change language when saved preference matches current i18n language', () => {
    i18n.language = 'vi';
    render(<LanguagePreferenceHydrator />);

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it('passes the real preference loader to useApiQuery', async () => {
    mockUseApiQuery.mockImplementation((_key, queryFn) => {
      void queryFn();
      return queryState(null) as never;
    });

    render(<LanguagePreferenceHydrator />);

    expect(preferenceService.me).toHaveBeenCalledTimes(1);
  });
});
