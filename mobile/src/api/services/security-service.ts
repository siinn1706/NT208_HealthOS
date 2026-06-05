import { apiRequest, buildQuery } from '../client';
import type { DataResponse } from '../../types/api';

export interface MfaStatus {
  enabled: boolean;
}

export interface MfaSetupPayload {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

export interface MfaVerifyResult {
  verified: boolean;
  method: string;
}

export interface MfaSetupState {
  enabled: boolean;
  recovery_codes?: string[] | null;
}

export interface SecurityLogItem {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const securityService = {
  async mfaStatus() {
    const response = await apiRequest<DataResponse<MfaStatus>>('/api/v1/mfa/status');
    return response.data;
  },

  async mfaSetup() {
    const response = await apiRequest<DataResponse<MfaSetupPayload>>('/api/v1/mfa/setup', {
      method: 'POST',
    });
    return response.data;
  },

  async verifyMfaSetup(code: string) {
    const response = await apiRequest<DataResponse<MfaSetupState>>('/api/v1/mfa/verify-setup', {
      method: 'POST',
      json: { code },
    });
    return response.data;
  },

  async verifyMfa(code: string) {
    const response = await apiRequest<DataResponse<MfaVerifyResult>>('/api/v1/mfa/verify', {
      method: 'POST',
      json: { code },
    });
    return response.data;
  },

  async disableMfa(code: string) {
    const response = await apiRequest<DataResponse<MfaSetupState>>('/api/v1/mfa/disable', {
      method: 'POST',
      json: { code },
    });
    return response.data;
  },

  async regenerateRecoveryCodes(code: string) {
    const response = await apiRequest<DataResponse<MfaSetupState>>('/api/v1/mfa/regenerate-recovery-codes', {
      method: 'POST',
      json: { code },
    });
    return response.data;
  },

  async securityLogs(params: { event_type?: string; limit?: number; offset?: number } = {}) {
    const response = await apiRequest<DataResponse<SecurityLogItem[]>>(`/api/v1/security-logs${buildQuery({
      event_type: params.event_type,
      limit: params.limit,
      offset: params.offset,
    })}`);
    return response.data;
  },
};
