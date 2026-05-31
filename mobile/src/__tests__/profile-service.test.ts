/* eslint-env jest */
import { profileService } from '../api/services/profile-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('profileService', () => {
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
