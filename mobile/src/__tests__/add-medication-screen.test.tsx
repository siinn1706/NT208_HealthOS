/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AddMedicationScreen } from '../components/meds/add-medication-screen';
import { medicationService } from '../api/services';
import { invalidateApiQuery } from '../api/query';

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    push: jest.fn(),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../api/services', () => ({
  medicationService: {
    create: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockCreate = medicationService.create as jest.MockedFunction<typeof medicationService.create>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({
    id: 'med-1',
    name: 'Metformin',
    generic_name: null,
    strength: '500 mg',
    form: 'tablet',
    instructions: null,
    prescriber: null,
    clinic: null,
    start_date: '2026-05-30',
    end_date: null,
    status: 'active',
    tzid: 'Asia/Ho_Chi_Minh',
    refill_supply_units: null,
    refill_cadence_days: null,
    last_refill_at: null,
    next_refill_estimated_at: null,
    review_due_at: null,
    appointment_id: null,
    notes: null,
    dose_count: 1,
    next_dose_at: null,
  });
});

describe('AddMedicationScreen', () => {
  it('persists a medication and replaces back to the meds hub', async () => {
    const { getAllByText, getByPlaceholderText } = render(<AddMedicationScreen />);

    fireEvent.changeText(getByPlaceholderText('e.g. Metformin'), 'Metformin');
    fireEvent.changeText(getByPlaceholderText('e.g. 500 mg'), '500 mg');
    fireEvent.press(getAllByText('meds.addMedication').at(-1)!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Metformin',
        strength: '500 mg',
      }));
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('medications.list');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/meds'));
    expect(mockBack).not.toHaveBeenCalled();
  });
});
