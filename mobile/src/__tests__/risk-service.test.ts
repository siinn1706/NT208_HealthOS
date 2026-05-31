/* eslint-env jest */
import { riskService } from '../api/services/risk-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('riskService', () => {
  it('loads the Core risk prediction summary', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { risks: [] } });

    await expect(riskService.summary()).resolves.toEqual({ risks: [] });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/health/risk-predictions');
  });

  it('refreshes risk predictions through POST without faking success locally', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { generatedAt: '2026-05-31T00:00:00Z' } });

    await expect(riskService.refresh()).resolves.toEqual({
      generatedAt: '2026-05-31T00:00:00Z',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/health/risk-predictions', {
      method: 'POST',
      timeoutMs: 60000,
    });
  });
});
