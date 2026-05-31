/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { VisitPrepScreen } from '../components/care/visit-prep-screen';
import { appointmentService } from '../api/services';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  appointmentService: {
    detail: jest.fn(),
    getPrep: jest.fn(),
    updatePrep: jest.fn(),
  },
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
const mockUpdatePrep = appointmentService.updatePrep as jest.MockedFunction<typeof appointmentService.updatePrep>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

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

  it('saves prep checklist through Core, invalidates prep cache, and reloads saved prep', async () => {
    const reloadPrep = jest.fn().mockResolvedValue(undefined);
    mockUpdatePrep.mockResolvedValue({
      appointment_id: 'apt-1',
      checklist_items: [
        { id: '1-bring-insurance-card', label: 'Bring insurance card', checked: true },
      ],
      notes: null,
      updated_at: '2026-05-31T10:00:00.000Z',
    });
    mockUseApiQuery.mockImplementation((key) => (
      key === queryKeys.appointmentPrep('apt-1')
        ? { ...baseQueryState, data: null, reload: reloadPrep }
        : appointmentQueryState
    ) as never);

    const { getByText } = render(<VisitPrepScreen />);

    fireEvent.press(getByText('Bring insurance card'));
    fireEvent.press(getByText('Save checklist'));

    await waitFor(() => {
      expect(mockUpdatePrep).toHaveBeenCalledWith('apt-1', {
        checklist_items: expect.arrayContaining([
          { id: '1-bring-insurance-card', label: 'Bring insurance card', checked: true },
        ]),
      });
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.appointmentPrep('apt-1'));
    expect(reloadPrep).toHaveBeenCalled();
  });
});
