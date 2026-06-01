/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import LabReportsScreen from '../../app/care/lab-reports';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../utils/safe-url', () => ({
  safeOpenUrl: jest.fn(),
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

describe('LabReportsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders lab reports from the appointment asset contract', () => {
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.appointmentAssetsByKind('lab_report')) {
        return {
          data: [{
            id: 'lab-1',
            appointment_id: 'apt-1',
            kind: 'lab_report',
            mime_type: 'application/pdf',
            size_bytes: 2048,
            sha256: 'abc',
            original_filename: 'blood-work.pdf',
            uploaded_at: '2099-06-02T10:00:00.000Z',
          }],
          error: null,
          isLoading: false,
          isRefreshing: false,
          isEmpty: false,
          reload: jest.fn(),
        } as never;
      }
      return { data: null, error: null, isLoading: false, isRefreshing: false, isEmpty: false, reload: jest.fn() } as never;
    });

    const { getByText, queryByText } = render(<LabReportsScreen />);

    expect(getByText('blood-work.pdf')).toBeTruthy();
    expect(getByText('application/pdf | 2 KB')).toBeTruthy();
    expect(queryByText('care.labReportsProductionMessage')).toBeNull();
  });
});
