import { apiRequest } from '../client';
import { clearStoredSession, getRefreshToken, saveAuthToken } from '../../auth/session-store';
import type { AuthToken, DataResponse } from '../../../../shared/api-contracts';

export const authService = {
  async login(identifier: string, password: string) {
    const response = await apiRequest<DataResponse<AuthToken>>('/v1/auth/login', {
      method: 'POST',
      auth: false,
      json: { identifier, password },
    });
    return response.data;
  },

  async requestOtp(body: {
    email: string;
    purpose: 'signup' | 'reset_password' | 'login';
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

  async resetPassword(email: string, newPassword: string) {
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
      await apiRequest('/v1/auth/logout', { method: 'POST' });
    } finally {
      await clearStoredSession().catch((e: unknown) => {
        if (__DEV__) console.warn('[authService] clearStoredSession failed during logout:', e);
      });
    }
  },

  /** Exchange stored refresh_token for new access_token. TODO: requires backend to emit refresh_token in AuthToken responses. */
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
