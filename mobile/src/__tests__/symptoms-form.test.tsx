/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SymptomsForm } from '../components/forms/symptoms-form';
import { useApiQuery } from '../api/query';
import { visitBriefService } from '../api/services';

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => mockParams),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  appointmentService: {
    list: jest.fn(),
  },
  visitBriefService: {
    create: jest.fn(),
    addSymptom: jest.fn(),
    routeNow: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockCreateBrief = visitBriefService.create as jest.MockedFunction<typeof visitBriefService.create>;
const mockAddSymptom = visitBriefService.addSymptom as jest.MockedFunction<typeof visitBriefService.addSymptom>;
const mockRouteNow = visitBriefService.routeNow as jest.MockedFunction<typeof visitBriefService.routeNow>;

const appointment = {
  id: 'apt-1',
  appointment_date: '2026-06-03T09:00:00.000Z',
  doctor_name: 'Dr. Lane',
  specialty: 'Primary care',
  clinic: 'HealthOS Clinic',
  diagnosis: null,
  visit_type: 'gp_routine',
  video_join_url: null,
  status: 'upcoming',
  notes: null,
  has_prescription: false,
  prescription: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockUseApiQuery.mockReturnValue({
    data: [appointment],
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: jest.fn(),
  } as never);
  mockCreateBrief.mockResolvedValue({ id: 'brief-1' } as never);
  mockAddSymptom.mockResolvedValue({ id: 'symptom-1' } as never);
  mockRouteNow.mockResolvedValue({ bucket: 'routine_followup' } as never);
});

describe('SymptomsForm', () => {
  it('attaches intake to the selected appointment and submits every selected symptom', async () => {
    const { getByText } = render(<SymptomsForm />);

    fireEvent.press(getByText('Dr. Lane'));
    ['Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Chest pain'].forEach((symptom) => {
      fireEvent.press(getByText(symptom));
    });
    fireEvent.press(getByText('forms.submitReport'));

    await waitFor(() => expect(mockCreateBrief).toHaveBeenCalledWith({
      visit_type: 'gp_routine',
      title: 'Mobile symptom intake: Dr. Lane',
      attach_to_appointment_id: 'apt-1',
    }));
    expect(mockAddSymptom).toHaveBeenCalledTimes(6);
    expect(mockAddSymptom.mock.calls.map(([, body]) => body.concern_text)).toEqual([
      'Headache',
      'Fever',
      'Cough',
      'Fatigue',
      'Nausea',
      'Chest pain',
    ]);
    expect(mockRouteNow).toHaveBeenCalledWith('brief-1');
  });

  it('requires an explicit appointment or standalone target', async () => {
    const { getByText } = render(<SymptomsForm />);

    fireEvent.press(getByText('Headache'));
    fireEvent.press(getByText('forms.submitReport'));

    expect(getByText('forms.selectVisitTarget')).toBeTruthy();
    expect(mockCreateBrief).not.toHaveBeenCalled();
  });

  it('keeps standalone reports explicit', async () => {
    const { getByText } = render(<SymptomsForm />);

    fireEvent.press(getByText('forms.standaloneSymptomReport'));
    fireEvent.press(getByText('Headache'));
    fireEvent.press(getByText('forms.submitReport'));

    await waitFor(() => expect(mockCreateBrief).toHaveBeenCalledWith({
      visit_type: 'gp_routine',
      title: 'Mobile symptom intake',
      attach_to_appointment_id: null,
    }));
    expect(mockAddSymptom).toHaveBeenCalledTimes(1);
  });
});
