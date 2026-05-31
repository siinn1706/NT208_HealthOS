/* eslint-env jest */
import { medicationService } from '../api/services/medication-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) qs.set(key, value);
    });
    const text = qs.toString();
    return text ? `?${text}` : '';
  },
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('medicationService', () => {
  it('uses Core medication endpoints for list, today, detail, and adherence reads', async () => {
    mockApiRequest.mockResolvedValue({ data: [] } as never);

    await medicationService.list('all');
    await medicationService.today('Asia/Ho_Chi_Minh');
    await medicationService.detail('med/1');
    await medicationService.adherence('med/1', '7d');

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/medications?status=all');
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/medications/today?tzid=Asia%2FHo_Chi_Minh');
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, '/v1/medications/med%2F1');
    expect(mockApiRequest).toHaveBeenNthCalledWith(4, '/v1/medications/med%2F1/adherence?period=7d');
  });

  it('sends medication create and update bodies directly to Core', async () => {
    const body = {
      name: 'Metformin',
      strength: '500 mg',
      form: 'tablet' as const,
      dose_times: ['08:00'],
      repeat: 'daily' as const,
      notes: null,
    };
    mockApiRequest.mockResolvedValue({ data: { id: 'med-1', ...body } } as never);

    await medicationService.create(body);
    await medicationService.update('med/1', { notes: 'with food' });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/medications', {
      method: 'POST',
      json: body,
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/medications/med%2F1', {
      method: 'PATCH',
      json: { notes: 'with food' },
    });
  });

  it('uses plan status and refill mutation endpoints without fake refill requests', async () => {
    mockApiRequest.mockResolvedValue({ data: { id: 'med-1' } } as never);

    await medicationService.pause('med/1');
    await medicationService.resume('med/1');
    await medicationService.archive('med/1');
    await medicationService.refill('med/1', 12);

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/medications/med%2F1/pause', {
      method: 'POST',
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/medications/med%2F1/resume', {
      method: 'POST',
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, '/v1/medications/med%2F1', {
      method: 'DELETE',
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(4, '/v1/medications/med%2F1/refill', {
      method: 'POST',
      json: { supply_units: 12 },
    });
  });

  it('imports selected prescription medicines from an appointment', async () => {
    const importResult = {
      created: [],
      skipped: [{ medicine_index: 1, name: 'Aspirin', reason: 'already imported', existing_plan_id: 'med-1' }],
    };
    mockApiRequest.mockResolvedValueOnce({ data: importResult } as never);

    await expect(medicationService.importFromAppointment('apt/1', {
      default_dose_times: ['08:00'],
      default_repeat: 'daily',
      medicine_indices: [0, 2],
    })).resolves.toEqual(importResult);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/medications/import/apt%2F1', {
      method: 'POST',
      json: {
        default_dose_times: ['08:00'],
        default_repeat: 'daily',
        medicine_indices: [0, 2],
      },
    });
  });

  it('routes medication dose actions through reminder occurrence endpoints', async () => {
    mockApiRequest.mockResolvedValue({ data: { id: 'occ-1' } } as never);

    await medicationService.markDoseDone('rem/1', 'occ/1');
    await medicationService.skipDose('rem/1', 'occ/1');

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/reminders/rem%2F1/done', {
      method: 'POST',
      json: { occurrence_id: 'occ/1' },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/reminders/rem%2F1/skip', {
      method: 'POST',
      json: { occurrence_id: 'occ/1' },
    });
  });
});
