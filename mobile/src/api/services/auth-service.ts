import { apiRequest } from '../client';
import { clearStoredSession, getRefreshToken, saveAuthToken } from '../../auth/session-store';
import type {
  AuthLoginResult,
  AuthToken,
  DataResponse,
  OtpNextStep,
  OtpRequested,
  RequestOtpBody,
  VerifyOtpBody,
} from '../../types/api';

export const authService = {
  async login(identifier: string, password: string) {
    const response = await apiRequest<DataResponse<AuthLoginResult>>('/v1/auth/login', {
      method: 'POST',
      auth: false,
      json: { identifier, password },
    });
    return response.data;
  },

  async verifyLoginMfa(challenge_id: string, code: string): Promise<AuthToken> {
    const response = await apiRequest<DataResponse<AuthToken>>('/v1/auth/login/mfa', {
      method: 'POST',
      auth: false,
      json: { challenge_id, code },
    });
    await saveAuthToken(response.data);
    return response.data;
  },

  async requestOtp(body: RequestOtpBody) {
    return apiRequest<DataResponse<OtpRequested>>('/v1/auth/request-otp', {
      method: 'POST',
      auth: false,
      json: body,
    });
  },

  async verifyOtp(body: VerifyOtpBody) {
    const response = await apiRequest<DataResponse<AuthToken | OtpNextStep>>('/v1/auth/verify-otp', {
      method: 'POST',
      auth: false,
      json: body,
    });
    if ('access_token' in response.data) {
      await saveAuthToken(response.data);
    }
    return response.data;
  },

  async resetPassword(email: string, newPassword: string): Promise<AuthToken> {
    const response = await apiRequest<DataResponse<AuthToken>>('/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      json: { email, new_password: newPassword },
    });
    await saveAuthToken(response.data);
    return response.data;
  },

  async logout() {
    try {
      const refresh_token = await getRefreshToken();
      await apiRequest('/v1/auth/logout', {
        method: 'POST',
        json: refresh_token ? { refresh_token } : {},
      });
    } finally {
      await clearStoredSession().catch((e: unknown) => {
        if (__DEV__) console.warn('[authService] clearStoredSession failed during logout:', e);
      });
    }
  },

  async refreshToken(): Promise<AuthToken> {
    const refresh_token = await getRefreshToken();
    if (!refresh_token) throw new Error('No refresh token stored.');
    const response = await apiRequest<DataResponse<AuthToken>>(
      '/v1/auth/refresh',
      { method: 'POST', auth: false, json: { refresh_token } },
    );
    await saveAuthToken(response.data);
    return response.data;
  },
};
