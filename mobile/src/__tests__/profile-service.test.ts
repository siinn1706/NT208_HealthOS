/* eslint-env jest */
import { profileService } from '../api/services/profile-service';
import { apiRequest } from '../api/client';
import { BOOTSTRAP_PROFILE_TIMEOUT_MS } from '../api/core-reachability';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
}));
jest.mock('../api/core-reachability', () => ({
  BOOTSTRAP_PROFILE_TIMEOUT_MS: 5000,
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('profileService', () => {
  it('uses a short timeout for bootstrap profile refresh', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'u1' } } as never);

    await expect(profileService.meForBootstrap()).resolves.toEqual({ id: 'u1' });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/users/me', {
      timeoutMs: BOOTSTRAP_PROFILE_TIMEOUT_MS,
    });
  });

  it('requests account deletion with the Core user contract', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: { status: 'pending_deletion', purge_at: '2026-06-30T00:00:00.000Z' },
    } as never);

    await expect(profileService.requestAccountDeletion({
      confirmation_email: 'person@example.com',
      password: 'secret',
      reason: 'cleanup',
    })).resolves.toEqual({
      status: 'pending_deletion',
      purge_at: '2026-06-30T00:00:00.000Z',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/users/me', {
      method: 'DELETE',
      json: {
        confirmation_email: 'person@example.com',
        password: 'secret',
        reason: 'cleanup',
      },
    });
  });

  it('restores a pending deletion account', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { status: 'active' } } as never);

    await expect(profileService.restoreAccount()).resolves.toEqual({ status: 'active' });
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/users/me/restore', { method: 'POST' });
  });
});
