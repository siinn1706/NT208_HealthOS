/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { LanguageSettingsSheet } from '../components/profile/language-settings-sheet';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { preferenceService } from '../api/services/preference-service';
import i18n from '../i18n';
import { queryKeys } from '../api/queryKeys';

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../api/services/preference-service', () => ({
  preferenceService: {
    me: jest.fn(),
    update: jest.fn(),
  },
}));

const mockTranslations: Record<string, string> = {
  'common.close': 'Close',
  'common.retry': 'Retry',
  'me.languageTitle': 'Language',
  'me.languageSubtitle': 'Saved to your HealthOS preferences.',
  'me.languageLoading': 'Loading language preference',
  'me.languagePreferenceUnavailable': 'Language preference unavailable',
  'me.languageOptionEnglish': 'English',
  'me.languageOptionEnglishDescription': 'Use English across the mobile app and AI responses.',
  'me.languageOptionVietnamese': 'Vietnamese',
  'me.languageOptionVietnameseDescription': 'Use Vietnamese across the mobile app and AI responses.',
  'me.languageOptionAccessibility': 'Set language to {{language}}',
  'me.languageUpdateSuccess': 'Language set to {{language}}.',
  'me.languageSaveFailed': 'Could not save language preference.',
  'me.languageUpdateFailed': 'Language update failed',
  'profile.saving': 'Saving',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      const value = mockTranslations[key] ?? key;
      return value.replace(/\{\{(\w+)\}\}/g, (_, name) => vars?.[name] ?? '');
    },
  }),
}));

jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    language: 'en',
    changeLanguage: jest.fn(),
  },
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockPreferenceService = preferenceService as jest.Mocked<typeof preferenceService>;
const mockChangeLanguage = i18n.changeLanguage as jest.MockedFunction<typeof i18n.changeLanguage>;

function queryState(data: unknown, overrides: Record<string, unknown> = {}) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: Array.isArray(data) ? data.length === 0 : false,
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseApiQuery.mockReturnValue(queryState({ theme_mode: 'system', accent_color: null, locale: 'en' }) as never);
  mockPreferenceService.update.mockResolvedValue({ theme_mode: 'system', accent_color: null, locale: 'vi' });
  mockChangeLanguage.mockResolvedValue(null as never);
});

describe('LanguageSettingsSheet', () => {
  it('saves the selected locale through preferences and updates i18n', async () => {
    const { getByText } = render(<LanguageSettingsSheet visible={true} onClose={() => {}} />);

    expect(getByText('English')).toBeTruthy();
    fireEvent.press(getByText('Vietnamese'));

    await waitFor(() => {
      expect(mockPreferenceService.update).toHaveBeenCalledWith({ locale: 'vi' });
      expect(mockChangeLanguage).toHaveBeenCalledWith('vi');
      expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.preferences);
    });
    expect(getByText('Language set to Vietnamese.')).toBeTruthy();
  });

  it('shows a retryable load error when preferences cannot load', () => {
    const reload = jest.fn();
    mockUseApiQuery.mockReturnValue(queryState(null, { error: new Error('Offline'), reload }) as never);

    const { getByText } = render(<LanguageSettingsSheet visible={true} onClose={() => {}} />);

    expect(getByText('Language preference unavailable')).toBeTruthy();
    expect(getByText('Offline')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not change app language when save fails', async () => {
    mockPreferenceService.update.mockRejectedValueOnce(new Error('Save failed'));
    const { getByText } = render(<LanguageSettingsSheet visible={true} onClose={() => {}} />);

    fireEvent.press(getByText('Vietnamese'));

    await waitFor(() => expect(getByText('Language update failed')).toBeTruthy());
    expect(getByText('Save failed')).toBeTruthy();
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });
});
