import { apiRequest, buildQuery } from '../client';
import type { DataResponse } from '../../types/api';

export type AssistanceNeed =
  | 'walking'
  | 'communication'
  | 'dietary'
  | 'hearing'
  | 'vision'
  | 'cognitive';

export type EmergencyVisibilityField =
  | 'blood_type'
  | 'age'
  | 'gender'
  | 'allergies'
  | 'conditions'
  | 'medications'
  | 'contacts'
  | 'assistance'
  | 'equipment'
  | 'communication'
  | 'preferred_language';

export interface EmergencyPublicContact {
  name: string;
  relationship: string | null;
  phone: string;
}

export interface EmergencyPublicMedication {
  name: string;
  strength: string | null;
}

export interface PublicEmergencyCard {
  full_name: string | null;
  age_years: number | null;
  gender: 'male' | 'female' | 'other' | null;
  preferred_language: string | null;
  blood_type: string | null;
  nkda_confirmed: boolean;
  allergies: string[];
  chronic_conditions: string[];
  medications: EmergencyPublicMedication[];
  assistance_needed: AssistanceNeed[];
  equipment_notes: string | null;
  communication_notes: string | null;
  emergency_contacts: EmergencyPublicContact[];
  last_updated_at: string | null;
}

export interface EmergencyCompletenessNudge {
  field: string;
  level: 'critical' | 'recommended';
  message_key: string;
  fix_path: string;
}

export interface EmergencyShareToken {
  id: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  is_active: boolean;
}

export interface EmergencyAccessLog {
  id: string;
  token_id: string;
  ip_truncated: string | null;
  user_agent: string | null;
  accessed_at: string;
}

export interface EmergencyProfileOwnerView {
  is_published: boolean;
  assistance_needed: AssistanceNeed[];
  equipment_notes: string | null;
  communication_notes: string | null;
  field_visibility: Record<string, boolean>;
  nkda_confirmed: boolean;
  preferred_language: string | null;
  last_published_at: string | null;
  card: PublicEmergencyCard;
  completeness_score: number;
  missing_critical_fields: string[];
  nudges: EmergencyCompletenessNudge[];
  tokens: EmergencyShareToken[];
  active_token_count: number;
  max_active_tokens: number;
}

export interface EmergencyProfileUpdateBody {
  is_published?: boolean;
  assistance_needed?: AssistanceNeed[];
  equipment_notes?: string | null;
  communication_notes?: string | null;
  field_visibility?: Partial<Record<EmergencyVisibilityField, boolean>>;
  nkda_confirmed?: boolean;
  preferred_language?: string | null;
}

export interface EmergencyShareTokenCreateBody {
  label: string;
  acknowledge_low_completeness?: boolean;
}

export interface EmergencyShareTokenWithSecret {
  token_meta: EmergencyShareToken;
  token: string;
  share_url: string;
  qr_png_data_url: string;
  wallet_pdf_data_url: string | null;
}

export const emergencyService = {
  async profile() {
    const response = await apiRequest<DataResponse<EmergencyProfileOwnerView>>('/api/v1/users/me/emergency-profile');
    return response.data;
  },

  async updateProfile(body: EmergencyProfileUpdateBody) {
    const response = await apiRequest<DataResponse<EmergencyProfileOwnerView>>('/api/v1/users/me/emergency-profile', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },

  async createToken(body: EmergencyShareTokenCreateBody) {
    const response = await apiRequest<DataResponse<EmergencyShareTokenWithSecret>>('/api/v1/users/me/emergency-profile/tokens', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async listTokens() {
    const response = await apiRequest<DataResponse<EmergencyShareToken[]>>('/api/v1/users/me/emergency-profile/tokens');
    return response.data;
  },

  async revokeToken(tokenId: string) {
    const response = await apiRequest<DataResponse<EmergencyShareToken[]>>(`/api/v1/users/me/emergency-profile/tokens/${encodeURIComponent(tokenId)}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  async revokeAllTokens() {
    const response = await apiRequest<DataResponse<EmergencyShareToken[]>>('/api/v1/users/me/emergency-profile/tokens/revoke-all', {
      method: 'POST',
    });
    return response.data;
  },

  async accessLogs(params: { limit?: number; token_id?: string } = {}) {
    const response = await apiRequest<DataResponse<EmergencyAccessLog[]>>(`/api/v1/users/me/emergency-profile/access-logs${buildQuery({
      limit: params.limit,
      token_id: params.token_id,
    })}`);
    return response.data;
  },
};
