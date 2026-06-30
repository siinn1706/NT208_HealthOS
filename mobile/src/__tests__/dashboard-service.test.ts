/* eslint-env jest */
import { dashboardService } from '../api/services/dashboard-service';
import { apiRequest, buildQuery } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: jest.fn((params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    ).toString();
    return qs ? `?${qs}` : '';
  }),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('dashboardService', () => {
  it('summary() fetches dashboard summary data', async () => {
    const payload = { health_score: 85, kpis: [], alerts: [] };
    mockApiRequest.mockResolvedValueOnce({ data: payload } as never);

    await expect(dashboardService.summary()).resolves.toEqual(payload);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/dashboard/summary');
  });

  it('vitals() fetches vitals timeseries with default 7-day window', async () => {
    const points = [{ date: '2026-06-01', value: 72, metric: 'heart_rate' }];
    mockApiRequest.mockResolvedValueOnce({ data: points } as never);

    await expect(dashboardService.vitals()).resolves.toEqual(points);
    expect(mockApiRequest).toHaveBeenCalledWith(expect.stringContaining('/api/v1/vitals/timeseries'));
  });

  it('vitals() passes custom days parameter', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] } as never);

    await dashboardService.vitals(30);
    expect(buildQuery).toHaveBeenCalledWith({ days: 30 });
  });

  it('upcomingReminders() fetches upcoming reminders', async () => {
    const reminders = [{ id: 'r-1', title: 'Take medication', scheduled_at: '2026-06-02T08:00:00Z' }];
    mockApiRequest.mockResolvedValueOnce({ data: reminders } as never);

    await expect(dashboardService.upcomingReminders()).resolves.toEqual(reminders);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/reminders/upcoming');
  });

  it('aiAdvice() fetches mobile advice through the BFF and unwraps DataResponse.data', async () => {
    const advice = { id: 'ai-advice-1', title: 'Walk', body: 'Take a short walk.' };
    mockApiRequest.mockResolvedValueOnce({ data: advice } as never);

    await expect(dashboardService.aiAdvice('en')).resolves.toEqual(advice);
    expect(buildQuery).toHaveBeenCalledWith({ surface: 'mobile', locale: 'en' });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/dashboard/ai-advice?surface=mobile&locale=en');
  });

  it('propagates ApiError from apiRequest', async () => {
    const err = new Error('Network error');
    mockApiRequest.mockRejectedValueOnce(err);

    await expect(dashboardService.summary()).rejects.toThrow('Network error');
  });
});
