import { authService } from '../api/services/auth-service';
import { apiRequest } from '../api/client';
import { clearStoredSession, getRefreshToken, saveAuthToken } from '../auth/session-store';
import type { AuthToken, DataResponse } from '../../../shared/api-contracts';

jest.mock('../api/client', () => ({ apiRequest: jest.fn() }));
jest.mock('../auth/session-store', () => ({
  saveAuthToken: jest.fn(),
  clearStoredSession: jest.fn(),
  getRefreshToken: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockSaveAuthToken = saveAuthToken as jest.MockedFunction<typeof saveAuthToken>;
const mockClearStoredSession = clearStoredSession as jest.MockedFunction<typeof clearStoredSession>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;

const mockToken: AuthToken = {
  access_token: 'tok',
  token_type: 'bearer',
  user_id: 'u1',
  email: 'a@b.com',
  username: null,
  display_name: 'A',
  avatar_url: null,
  onboarding_status: 'complete',
};

beforeEach(() => jest.clearAllMocks());

describe('authService.login', () => {
  it('returns token data without calling saveAuthToken', async () => {
    const resp: DataResponse<AuthToken> = { data: mockToken };
    mockApiRequest.mockResolvedValueOnce(resp);
    const result = await authService.login('user', 'pass');
    expect(result).toEqual(mockToken);
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });
});

describe('authService.verifyOtp', () => {
  it('calls saveAuthToken when response contains access_token', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    await authService.verifyOtp({ email: 'a@b.com', purpose: 'signup', code: '123456' });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
  });

  it('does not call saveAuthToken when response is next_step challenge', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { email: 'a@b.com', next_step: 'verify_email' } });
    await authService.verifyOtp({ email: 'a@b.com', purpose: 'login', code: '123456' });
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });
});

describe('authService.resetPassword', () => {
  it('saves token after successful reset', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    const result = await authService.resetPassword('a@b.com', 'newpass');
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });
});

describe('authService.refreshToken', () => {
  it('throws when no refresh token stored', async () => {
    mockGetRefreshToken.mockResolvedValueOnce(null);
    await expect(authService.refreshToken()).rejects.toThrow('No refresh token stored.');
  });

  it('calls /v1/auth/refresh with auth:false and saves token', async () => {
    mockGetRefreshToken.mockResolvedValueOnce('rt-tok');
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    const result = await authService.refreshToken();
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/refresh', {
      method: 'POST',
      auth: false,
      json: { refresh_token: 'rt-tok' },
    });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });
});

describe('authService.logout', () => {
  it('clears session even when API call fails', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('network'));
    mockClearStoredSession.mockResolvedValueOnce();
    await authService.logout().catch(() => undefined);
    expect(mockClearStoredSession).toHaveBeenCalled();
  });

  it('clears session on success', async () => {
    mockApiRequest.mockResolvedValueOnce(undefined);
    mockClearStoredSession.mockResolvedValueOnce();
    await authService.logout();
    expect(mockClearStoredSession).toHaveBeenCalled();
  });
});
