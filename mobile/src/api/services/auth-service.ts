import { apiRequest } from '../client';
import { clearStoredSession, getRefreshToken, saveAuthToken } from '../../auth/session-store';
import type { AuthLoginResult, AuthToken, DataResponse } from '../../../../shared/api-contracts';

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

  async requestOtp(body: {
    email: string;
    purpose: 'signup' | 'reset_password' | 'login' | 'delete_account';
    name?: string;
    username?: string;
    password?: string;
  }) {
    return apiRequest<DataResponse<{ delivery: 'email'; expires_in_seconds: number; otp?: string }>>('/v1/auth/request-otp', {
      method: 'POST',
      auth: false,
      json: body,
    });
  },

  async verifyOtp(body: {
    email: string;
    purpose: 'signup' | 'reset_password' | 'login';
    code: string;
    password?: string;
  }) {
    const response = await apiRequest<DataResponse<AuthToken | { email: string; next_step: string }>>('/v1/auth/verify-otp', {
      method: 'POST',
      auth: false,
      json: body,
    });
    if ('access_token' in response.data) {
      await saveAuthToken(response.data);
    }
    return response.data;
  },

  async resetPassword(email: string, newPassword: string, code?: string) {
    await apiRequest<DataResponse<AuthToken>>('/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      json: { email, new_password: newPassword, ...(code ? { code } : {}) },
    });
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
