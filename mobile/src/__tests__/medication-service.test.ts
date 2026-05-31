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
});
