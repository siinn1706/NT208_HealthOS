/* eslint-env jest */
import { appointmentService } from '../api/services/appointment-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('appointmentService', () => {
  it('creates appointments through the Core POST endpoint', async () => {
    const body = {
      appointment_date: '2099-06-05T10:30:00.000Z',
      doctor_name: 'Dr Create',
      specialty: 'Cardiology',
      clinic: 'Core Clinic',
      reason: 'Follow up',
      notes: 'Bring prior lab work.',
    };
    mockApiRequest.mockResolvedValueOnce({
      data: {
        id: 'apt-new',
        ...body,
        diagnosis: null,
        visit_type: null,
        status: 'scheduled',
        has_prescription: false,
        prescription: null,
      },
    } as never);

    await expect(appointmentService.create(body)).resolves.toMatchObject({
      id: 'apt-new',
      doctor_name: 'Dr Create',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/appointments', {
      method: 'POST',
      json: body,
    });
  });

  it('updates appointment detail fields through the Core PATCH endpoint', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        id: 'apt-1',
        appointment_date: '2099-06-04T10:30:00.000Z',
        doctor_name: 'Dr Care',
        specialty: 'Primary care',
        clinic: 'Clinic A',
        diagnosis: null,
        visit_type: 'in-person',
        status: 'scheduled',
        notes: null,
        has_prescription: false,
        prescription: null,
      },
    } as never);

    await expect(appointmentService.update('apt/1', {
      appointment_date: '2099-06-04T10:30:00.000Z',
    })).resolves.toMatchObject({
      id: 'apt-1',
      appointment_date: '2099-06-04T10:30:00.000Z',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/appointments/apt%2F1', {
      method: 'PATCH',
      json: { appointment_date: '2099-06-04T10:30:00.000Z' },
    });
  });

  it('loads appointment prep checklist', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: { appointment_id: 'apt-1', checklist_items: [], notes: null, updated_at: null },
    } as never);

    await expect(appointmentService.getPrep('apt/1')).resolves.toEqual({
      appointment_id: 'apt-1',
      checklist_items: [],
      notes: null,
      updated_at: null,
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/appointments/apt%2F1/prep');
  });

  it('updates appointment prep checklist', async () => {
    const checklist = [{ id: '1-card', label: 'Bring insurance card', checked: true }];
    mockApiRequest.mockResolvedValueOnce({
      data: { appointment_id: 'apt-1', checklist_items: checklist, notes: null, updated_at: '2026-05-30T03:00:00.000Z' },
    } as never);

    await expect(appointmentService.updatePrep('apt-1', { checklist_items: checklist })).resolves.toEqual({
      appointment_id: 'apt-1',
      checklist_items: checklist,
      notes: null,
      updated_at: '2026-05-30T03:00:00.000Z',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/appointments/apt-1/prep', {
      method: 'PATCH',
      json: { checklist_items: checklist },
    });
  });

  it('updates appointment status through the FSM endpoint', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        id: 'apt-1',
        appointment_date: '2099-06-04T10:30:00.000Z',
        doctor_name: 'Dr Care',
        specialty: 'Primary care',
        clinic: 'Clinic A',
        diagnosis: null,
        visit_type: 'in-person',
        status: 'cancelled',
        notes: null,
        has_prescription: false,
        prescription: null,
      },
    } as never);

    await expect(appointmentService.updateStatus('apt/1', 'cancelled')).resolves.toMatchObject({
      id: 'apt-1',
      status: 'cancelled',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/appointments/apt%2F1/status', {
      method: 'PATCH',
      json: { status: 'cancelled' },
    });
  });
});
