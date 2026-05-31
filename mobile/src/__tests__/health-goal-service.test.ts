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
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/goals/progress?metric=weight_kg&target=70&period=7d');
  });
});
