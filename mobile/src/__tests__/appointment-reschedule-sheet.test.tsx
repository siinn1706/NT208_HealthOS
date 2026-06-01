/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { Appointment } from '../../../shared/api-contracts';
import { AppointmentRescheduleSheet } from '../components/care/appointment-reschedule-sheet';
import { toIsoAppointment } from '../components/care/appointment-date-time';
import { appointmentService } from '../api/services';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../components/primitives/sheet/bottom-sheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
    visible ? <>{children}</> : null
  ),
}));

jest.mock('../api/services', () => ({
  appointmentService: {
    update: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

const mockAppointmentUpdate = appointmentService.update as jest.MockedFunction<typeof appointmentService.update>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

const appointment: Appointment = {
  id: 'apt-1',
  appointment_date: '2099-06-02T09:00:00.000Z',
  doctor_name: 'Dr Care',
  specialty: 'Primary care',
  clinic: 'Clinic A',
  diagnosis: null,
  visit_type: 'in_person',
  video_join_url: null,
  status: 'scheduled',
  notes: null,
  has_prescription: false,
  prescription: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAppointmentUpdate.mockResolvedValue(appointment);
});

describe('AppointmentRescheduleSheet', () => {
  it('saves a new appointment date through appointmentService.update', async () => {
    const { getByLabelText, getByText } = render(
      <AppointmentRescheduleSheet visible={true} appointment={appointment} onClose={() => {}} />,
    );

    fireEvent.changeText(getByLabelText('Date'), '2099-06-04');
    fireEvent.changeText(getByLabelText('Time'), '10:30');
    fireEvent.press(getByText('Save reschedule'));

    await waitFor(() => {
      expect(mockAppointmentUpdate).toHaveBeenCalledWith('apt-1', {
        appointment_date: toIsoAppointment('2099-06-04', '10:30'),
      });
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.appointments);
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.appointment('apt-1'));
    await waitFor(() => expect(getByText('Appointment rescheduled.')).toBeTruthy());
  });

  it('shows validation errors without calling the API', async () => {
    const { getByLabelText, getByText } = render(
      <AppointmentRescheduleSheet visible={true} appointment={appointment} onClose={() => {}} />,
    );

    fireEvent.changeText(getByLabelText('Date'), 'not-a-date');
    fireEvent.press(getByText('Save reschedule'));

    await waitFor(() => expect(getByText('Unable to reschedule appointment')).toBeTruthy());
    expect(getByText('Enter a valid appointment date and time.')).toBeTruthy();
    expect(mockAppointmentUpdate).not.toHaveBeenCalled();
  });
});
