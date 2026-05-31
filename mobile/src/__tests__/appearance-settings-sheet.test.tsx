/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppearanceSheet } from '../components/profile/me-screen-modals';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { preferenceService } from '../api/services/preference-service';
import { queryKeys } from '../api/queryKeys';

let mockThemeName: 'calm' | 'night' | 'warm' = 'calm';
const mockSetTheme = jest.fn();

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({ name: mockThemeName, setTheme: mockSetTheme }),
}));

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

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockPreferenceService = preferenceService as jest.Mocked<typeof preferenceService>;

function queryState(data: unknown, overrides: Record<string, unknown> = {}) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockThemeName = 'calm';
  mockUseApiQuery.mockReturnValue(queryState({ theme_mode: 'light', accent_color: '#1965B3', locale: 'en' }) as never);
  mockPreferenceService.update.mockResolvedValue({ theme_mode: 'light', accent_color: '#B97843', locale: 'en' });
});

describe('AppearanceSheet', () => {
  it('saves warm appearance through Core preferences', async () => {
    const onClose = jest.fn();
    const { getByText } = render(<AppearanceSheet visible={true} onClose={onClose} />);

    fireEvent.press(getByText('Warm Care'));

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('warm');
      expect(mockPreferenceService.update).toHaveBeenCalledWith({
        theme_mode: 'light',
        accent_color: '#B97843',
      });
      expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.preferences);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('reverts local appearance when preference save fails', async () => {
    mockPreferenceService.update.mockRejectedValueOnce(new Error('Save failed'));
    const { getByText } = render(<AppearanceSheet visible={true} onClose={() => {}} />);

    fireEvent.press(getByText('Night Sky'));

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('night');
      expect(mockSetTheme).toHaveBeenCalledWith('calm');
      expect(getByText('Appearance update failed')).toBeTruthy();
    });
  });
});
