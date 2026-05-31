/* eslint-env jest */
import { healthMetricService } from '../api/services/health-metric-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('healthMetricService', () => {
  it('creates a manual health metric through the Core health-metrics endpoint', async () => {
    const metric = {
      id: 'metric-1',
      user_id: 'user-1',
      metric_type: 'heart_rate',
      value: 72,
      unit: 'bpm',
      recorded_at: '2026-05-31T10:00:00.000Z',
      source: 'manual',
    };
    mockApiRequest.mockResolvedValueOnce(metric as never);

    await expect(healthMetricService.create({
      metric_type: 'heart_rate',
      value: 72,
      unit: 'bpm',
      recorded_at: '2026-05-31T10:00:00.000Z',
    })).resolves.toEqual(metric);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/health-metrics', {
      method: 'POST',
      json: {
        source: 'manual',
        metric_type: 'heart_rate',
        value: 72,
        unit: 'bpm',
        recorded_at: '2026-05-31T10:00:00.000Z',
      },
    });
  });

  it('creates a manual weight metric for goal progress', async () => {
    const metric = {
      id: 'metric-2',
      user_id: 'user-1',
      metric_type: 'weight_kg',
      value: 70.5,
      unit: 'kg',
      recorded_at: '2026-05-31T10:00:00.000Z',
      source: 'manual',
    };
    mockApiRequest.mockResolvedValueOnce(metric as never);

    await expect(healthMetricService.create({
      metric_type: 'weight_kg',
      value: 70.5,
      unit: 'kg',
      recorded_at: '2026-05-31T10:00:00.000Z',
    })).resolves.toEqual(metric);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/health-metrics', {
      method: 'POST',
      json: {
        source: 'manual',
        metric_type: 'weight_kg',
        value: 70.5,
        unit: 'kg',
        recorded_at: '2026-05-31T10:00:00.000Z',
      },
    });
  });
});
