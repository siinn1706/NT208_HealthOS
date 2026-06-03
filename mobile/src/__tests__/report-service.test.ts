/* eslint-env jest */
import { reportService } from '../api/services/report-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: jest.requireActual('../api/client').buildQuery,
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('reportService', () => {
  it('generates reports through POST /v1/reports with the selected period', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { generated_at: '2026-05-31T00:00:00Z' } });

    await expect(reportService.generate('30d')).resolves.toEqual({
      generated_at: '2026-05-31T00:00:00Z',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/reports?period=30d', {
      method: 'POST',
      timeoutMs: 60000,
    });
  });

  it('requests calorie trends through the existing Core trend endpoint', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { trend: 'increasing' } });

    await expect(reportService.trends('calories', '7d')).resolves.toEqual({ trend: 'increasing' });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/reports/trends?metric=calories&period=7d');
  });

  it('requests batch trend analysis through the existing Core report endpoint', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { blood_pressure: { trend: 'declining' } } });

    await expect(reportService.trendsBatch(['blood_pressure', 'bmi'], '30d')).resolves.toEqual({
      blood_pressure: { trend: 'declining' },
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/reports/trends/batch?metrics=blood_pressure%2Cbmi&period=30d');
  });
});
