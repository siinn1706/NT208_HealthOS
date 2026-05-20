/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { SecurityScreen } from '../components/profile/security-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({ user: { email: 'test@example.com' } }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;

function queryState(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: Array.isArray(data) ? data.length === 0 : false,
    reload: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseApiQuery.mockImplementation((key: string) => {
    if (key === queryKeys.mfaStatus) return queryState({ enabled: true }) as never;
    if (key === queryKeys.securityLogs) {
      return queryState([{ id: 'log-1', event_type: 'mfa_enabled', created_at: '2026-05-20T10:00:00.000Z' }]) as never;
    }
    return queryState(null) as never;
  });
});

describe('SecurityScreen', () => {
  it('renders MFA state and security log entries', () => {
    const { getByText } = render(<SecurityScreen />);
    expect(getByText('MFA is active')).toBeTruthy();
    expect(getByText(/mfa enabled/i)).toBeTruthy();
  });
});
