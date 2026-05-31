/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReportsHubScreen } from '../components/insights/reports/reports-hub-screen';
import { useApiQuery } from '../api/query';
import { reportService } from '../api/services';
import { router } from 'expo-router';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  reportService: {
    get: jest.fn(),
    generate: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;
const mockGenerate = reportService.generate as jest.MockedFunction<typeof reportService.generate>;

const emptyReport = {
  generated_at: null,
  sections: [],
  status: 'normal',
};

const baseQueryState = {
  data: emptyReport,
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('ReportsHubScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes unsupported search/filter controls and keeps the empty-state action real', () => {
    mockUseApiQuery.mockReturnValue(baseQueryState as never);

    const { getByText, queryByLabelText, queryByText } = render(<ReportsHubScreen />);

    expect(queryByLabelText('common.search')).toBeNull();
    expect(queryByLabelText('common.filter')).toBeNull();
    expect(queryByText('insights.learnHow')).toBeNull();

    fireEvent.press(getByText('insights.logToday'));

    expect(mockRouterPush).toHaveBeenCalledWith('/home');
  });

  it('routes reconnect from the error state to device connections', () => {
    mockUseApiQuery.mockImplementation((key) => ({
      ...baseQueryState,
      data: String(key).endsWith('7d') ? null : emptyReport,
      error: String(key).endsWith('7d') ? new Error('Activity sync failed') : null,
    }) as never);

    const { getByText } = render(<ReportsHubScreen />);

    fireEvent.press(getByText('Reconnect'));

    expect(mockRouterPush).toHaveBeenCalledWith('/profile/devices');
  });

  it('calls the Core report generator and reloads the monthly report', async () => {
    const reload7d = jest.fn().mockResolvedValue(undefined);
    const reload30d = jest.fn().mockResolvedValue(undefined);
    mockGenerate.mockResolvedValue({ generated_at: '2026-05-31T00:00:00Z', sections: [{}] });
    mockUseApiQuery.mockImplementation((key) => ({
      ...baseQueryState,
      data: {
        generated_at: '2026-05-31T00:00:00Z',
        sections: [{ summary: String(key).endsWith('30d') ? 'Monthly report ready' : 'Weekly report ready' }],
        status: 'normal',
      },
      reload: String(key).endsWith('30d') ? reload30d : reload7d,
    }) as never);

    const { getByText } = render(<ReportsHubScreen />);

    fireEvent.press(getByText('insights.generateReport'));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith('30d'));
    expect(reload30d).toHaveBeenCalled();
    expect(reload7d).not.toHaveBeenCalled();
  });
});
