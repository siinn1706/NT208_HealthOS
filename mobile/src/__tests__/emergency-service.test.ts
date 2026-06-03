/* eslint-env jest */
import { emergencyService } from '../api/services/emergency-service';
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

describe('emergencyService', () => {
  it('loads owner emergency profile', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { is_published: true } } as never);

    await expect(emergencyService.profile()).resolves.toEqual({ is_published: true });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/emergency-profile');
  });

  it('updates owner emergency profile', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { nkda_confirmed: true } } as never);

    await expect(emergencyService.updateProfile({ nkda_confirmed: true })).resolves.toEqual({ nkda_confirmed: true });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/emergency-profile', {
      method: 'PATCH',
      json: { nkda_confirmed: true },
    });
  });

  it('creates token with acknowledge flag', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { token: 'abc', share_url: 'https://x' } } as never);

    await expect(
      emergencyService.createToken({ label: 'Mobile token', acknowledge_low_completeness: true }),
    ).resolves.toEqual({ token: 'abc', share_url: 'https://x' });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/emergency-profile/tokens', {
      method: 'POST',
      json: { label: 'Mobile token', acknowledge_low_completeness: true },
    });
  });

  it('lists existing share tokens', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [{ id: 'tok-1', is_active: true }] } as never);

    await expect(emergencyService.listTokens()).resolves.toEqual([{ id: 'tok-1', is_active: true }]);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/emergency-profile/tokens');
  });

  it('revokes a single token', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [{ id: 'tok-1', is_active: false }] } as never);

    await expect(emergencyService.revokeToken('tok/1')).resolves.toEqual([{ id: 'tok-1', is_active: false }]);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/emergency-profile/tokens/tok%2F1', {
      method: 'DELETE',
    });
  });

  it('revokes all active tokens', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] } as never);

    await expect(emergencyService.revokeAllTokens()).resolves.toEqual([]);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/emergency-profile/tokens/revoke-all', {
      method: 'POST',
    });
  });

  it('builds access-log query params', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] } as never);

    await expect(emergencyService.accessLogs({ limit: 5, token_id: 'tok-1' })).resolves.toEqual([]);
    expect(mockBuildQuery).toHaveBeenCalledWith({ limit: 5, token_id: 'tok-1' });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/emergency-profile/access-logs?limit=5&token_id=tok-1');
  });
});
