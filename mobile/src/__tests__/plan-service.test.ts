/* eslint-env jest */
import { apiRequest, buildQuery } from '../api/client';
import { planService } from '../api/services/plan-service';

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

describe('planService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists active plans with Core pagination params', async () => {
    const plan = { id: 'plan-1', title: 'Prevention plan', status: 'active' };
    mockApiRequest.mockResolvedValueOnce({ data: [plan], meta: { next_cursor: null, has_more: false, per_page: 100 } } as never);

    await expect(planService.list({ status: 'active', perPage: 100 })).resolves.toEqual([plan]);

    expect(mockBuildQuery).toHaveBeenCalledWith({ status: 'active', per_page: 100, cursor: undefined });
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/plans?status=active&per_page=100');
  });

  it('finds an active category plan across Core pagination pages', async () => {
    const otherPlan = { id: 'plan-other', category: 'other', status: 'active', archived_at: null };
    const preventionPlan = { id: 'plan-prevention', category: 'risk_prevention', status: 'active', archived_at: null };
    mockApiRequest
      .mockResolvedValueOnce({ data: [otherPlan], meta: { next_cursor: 'cursor-2', has_more: true, per_page: 100 } } as never)
      .mockResolvedValueOnce({ data: [preventionPlan], meta: { next_cursor: null, has_more: false, per_page: 100 } } as never);

    await expect(planService.findActiveByCategory('risk_prevention')).resolves.toEqual(preventionPlan);

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/plans?status=active&per_page=100');
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/plans?status=active&per_page=100&cursor=cursor-2');
  });

  it('creates a wellness plan through Core', async () => {
    const plan = { id: 'plan-1', title: 'Prevention plan' };
    const body = { title: 'Prevention plan', category: 'risk_prevention', items: [{ id: 'risk-1' }] };
    mockApiRequest.mockResolvedValueOnce({ data: plan } as never);

    await expect(planService.create(body)).resolves.toEqual(plan);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/plans', {
      method: 'POST',
      json: body,
    });
  });

  it('patches a wellness plan through Core', async () => {
    const plan = { id: 'plan-1', title: 'Prevention plan' };
    const body = { items: [{ id: 'risk-1' }] };
    mockApiRequest.mockResolvedValueOnce({ data: plan } as never);

    await expect(planService.update('plan/1', body)).resolves.toEqual(plan);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/plans/plan%2F1', {
      method: 'PATCH',
      json: body,
    });
  });
});
