/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { VisitPrepScreen } from '../components/care/visit-prep-screen';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'apt-1' }),
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

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

const appointmentQueryState = {
  ...baseQueryState,
  data: {
    id: 'apt-1',
    doctor_name: 'Dr Prep',
    specialty: 'Primary care',
    appointment_date: '2026-06-02T09:00:00.000Z',
  },
};

describe('VisitPrepScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not let a late prep GET overwrite local checklist edits', () => {
    let prepQueryState: any = {
      ...baseQueryState,
      data: null,
    };
    mockUseApiQuery.mockImplementation((key) => (
      String(key).startsWith('appointments.prep.') ? prepQueryState : appointmentQueryState
    ) as never);

    const { getByText, rerender } = render(<VisitPrepScreen />);

    fireEvent.press(getByText('Bring insurance card'));
    expect(StyleSheet.flatten(getByText('Bring insurance card').props.style).textDecorationLine).toBe('line-through');

    prepQueryState = {
      ...baseQueryState,
      data: {
        appointment_id: 'apt-1',
        checklist_items: [
          { id: '1-bring-insurance-card', label: 'Bring insurance card', checked: false },
        ],
        notes: null,
        updated_at: '2026-05-30T00:00:00.000Z',
      },
    };
    rerender(<VisitPrepScreen />);

    expect(StyleSheet.flatten(getByText('Bring insurance card').props.style).textDecorationLine).toBe('line-through');
  });
});
