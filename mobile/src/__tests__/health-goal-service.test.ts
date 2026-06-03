/* eslint-env jest */
import { healthGoalService } from '../api/services/health-goal-service';
import { apiRequest, buildQuery } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: jest.fn((params: Record<string, unknown>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    const text = search.toString();
    return text ? `?${text}` : '';
  }),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockBuildQuery = buildQuery as jest.MockedFunction<typeof buildQuery>;

beforeEach(() => jest.clearAllMocks());

describe('healthGoalService', () => {
  it('loads weight progress from the Core goals progress endpoint', async () => {
    const progress = [
      { date: '2026-05-31', value: 74, target: 70, progress_percent: 105.7 },
    ];
    mockApiRequest.mockResolvedValueOnce({ data: progress } as never);

    await expect(healthGoalService.progress({
      metric: 'weight_kg',
      target: 70,
      period: '7d',
    })).resolves.toEqual(progress);

    expect(mockBuildQuery).toHaveBeenCalledWith({
      metric: 'weight_kg',
      target: 70,
      period: '7d',
    });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/goals/progress?metric=weight_kg&target=70&period=7d');
  });

  it('fetches the current health goal', async () => {
    const goal = { id: 'g1', target_weight_kg: 70, deadline: '2026-12-31' };
    mockApiRequest.mockResolvedValueOnce({ data: goal } as never);

    await expect(healthGoalService.current()).resolves.toEqual(goal);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/health-goals');
  });

  it('returns null when no health goal is set', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: null } as never);
    await expect(healthGoalService.current()).resolves.toBeNull();
  });

  it('creates or updates a health goal', async () => {
    const goal = { id: 'g2', target_weight_kg: 65, deadline: '2026-06-30' };
    mockApiRequest.mockResolvedValueOnce({ data: goal } as never);

    await expect(healthGoalService.upsert({ target_weight_kg: 65, deadline: '2026-06-30' })).resolves.toEqual(goal);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/health-goals', {
      method: 'POST',
      json: { target_weight_kg: 65, deadline: '2026-06-30' },
    });
  });

  it('upserts a health goal without deadline', async () => {
    const goal = { id: 'g3', target_weight_kg: 68, deadline: null };
    mockApiRequest.mockResolvedValueOnce({ data: goal } as never);

    await expect(healthGoalService.upsert({ target_weight_kg: 68 })).resolves.toEqual(goal);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/health-goals', {
      method: 'POST',
      json: { target_weight_kg: 68 },
    });
  });
});
