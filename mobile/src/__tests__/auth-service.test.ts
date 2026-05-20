/* eslint-env jest */
import { authService } from '../api/services/auth-service';
import { apiRequest } from '../api/client';
import { clearStoredSession, getRefreshToken, saveAuthToken } from '../auth/session-store';
import type { AuthLoginResult, AuthToken, DataResponse } from '../types/api';

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
    const resp: DataResponse<AuthLoginResult> = { data: mockToken };
    mockApiRequest.mockResolvedValueOnce(resp);
    const result = await authService.login('user', 'pass');
    expect(result).toEqual(mockToken);
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });

  it('returns MFA challenge when backend requires second factor', async () => {
    const resp: DataResponse<AuthLoginResult> = {
      data: { mfa_required: true, challenge_id: 'ch-1', expires_in_seconds: 300 },
    };
    mockApiRequest.mockResolvedValueOnce(resp);
    const result = await authService.login('user', 'pass');
    expect(result).toEqual(resp.data);
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

describe('authService.verifyLoginMfa', () => {
  it('calls /v1/auth/login/mfa and stores returned session token', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    const result = await authService.verifyLoginMfa('challenge-id', '123456');
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/login/mfa', {
      method: 'POST',
      auth: false,
      json: { challenge_id: 'challenge-id', code: '123456' },
    });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });
});

describe('authService.resetPassword', () => {
  it('submits reset payload and stores returned token', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    const result = await authService.resetPassword('a@b.com', 'newpass');
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      json: { email: 'a@b.com', new_password: 'newpass' },
    });
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
    mockGetRefreshToken.mockResolvedValueOnce('rt-tok');
    mockApiRequest.mockRejectedValueOnce(new Error('network'));
    mockClearStoredSession.mockResolvedValueOnce();
    await authService.logout().catch(() => undefined);
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/logout', {
      method: 'POST',
      json: { refresh_token: 'rt-tok' },
    });
    expect(mockClearStoredSession).toHaveBeenCalled();
  });

  it('clears session on success when no refresh token is stored', async () => {
    mockGetRefreshToken.mockResolvedValueOnce(null);
    mockApiRequest.mockResolvedValueOnce(undefined);
    mockClearStoredSession.mockResolvedValueOnce();
    await authService.logout();
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/logout', {
      method: 'POST',
      json: {},
    });
    expect(mockClearStoredSession).toHaveBeenCalled();
  });
});
