/* eslint-env jest */
import { preferenceService } from '../api/services/preference-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({ apiRequest: jest.fn() }));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('preferenceService', () => {
  it('me() fetches user preferences', async () => {
    const pref = { theme_mode: 'light' as const, accent_color: null, locale: 'en' as const };
    mockApiRequest.mockResolvedValueOnce({ data: pref } as never);

    await expect(preferenceService.me()).resolves.toEqual(pref);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/preferences/me');
  });

  it('update() patches user preferences', async () => {
    const updated = { theme_mode: 'dark' as const, accent_color: null, locale: 'en' as const };
    mockApiRequest.mockResolvedValueOnce({ data: updated } as never);

    await expect(preferenceService.update({ theme_mode: 'dark' })).resolves.toEqual(updated);
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/preferences/me', {
      method: 'PATCH',
      json: { theme_mode: 'dark' },
    });
  });

  it('propagates errors from apiRequest', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('Network error'));
    await expect(preferenceService.me()).rejects.toThrow('Network error');
  });
});
