/* eslint-env jest */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppearancePreferenceHydrator } from '../theme/appearance-preference-hydrator';
import { useSession } from '../auth/session-provider';
import { useApiQuery } from '../api/query';
import { preferenceService } from '../api/services/preference-service';
import { queryKeys } from '../api/queryKeys';

const mockSetTheme = jest.fn();

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

jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({ name: 'calm', setTheme: mockSetTheme }),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;

function queryState(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({
    user: { id: 'user-1', email: 'test@example.com' },
    booting: false,
    authenticated: true,
  } as never);
  mockUseApiQuery.mockReturnValue(queryState({ theme_mode: 'dark', accent_color: '#5BA8C8', locale: 'en' }) as never);
});

describe('AppearancePreferenceHydrator', () => {
  it('hydrates saved appearance after authenticated boot', async () => {
    render(<AppearancePreferenceHydrator />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.preferences,
      expect.any(Function),
      { enabled: true },
    );
    await waitFor(() => expect(mockSetTheme).toHaveBeenCalledWith('night'));
  });

  it('does not fetch preferences while unauthenticated', () => {
    mockUseSession.mockReturnValue({ user: null, booting: false, authenticated: false } as never);
    render(<AppearancePreferenceHydrator />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.preferences,
      expect.any(Function),
      { enabled: false },
    );
    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it('passes the real preference loader to useApiQuery', () => {
    mockUseApiQuery.mockImplementation((_key, queryFn) => {
      void queryFn();
      return queryState(null) as never;
    });

    render(<AppearancePreferenceHydrator />);

    expect(preferenceService.me).toHaveBeenCalledTimes(1);
  });
});
