export interface DataResponse<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: unknown;
  field_errors?: Record<string, string>;
}

export interface ErrorResponse {
  error: ErrorDetail;
}

export interface MfaLoginRequired {
  mfa_required: true;
  challenge_id: string;
  expires_in_seconds: number;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  refresh_token?: string | null;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  onboarding_status: string;
}

export type AuthLoginResult = AuthToken | MfaLoginRequired;

export type RequestOtpPurpose = 'signup' | 'reset_password' | 'login' | 'delete_account';
export type VerifyOtpPurpose = 'signup' | 'reset_password' | 'login';

export interface RequestOtpBody {
  email: string;
  purpose: RequestOtpPurpose;
  name?: string;
  username?: string;
  password?: string;
}

export interface VerifyOtpBody {
  email: string;
  purpose: VerifyOtpPurpose;
  code: string;
  password?: string;
}

export interface OtpRequested {
  delivery: 'email';
  expires_in_seconds: number;
  otp?: string;
}

export interface OtpNextStep {
  email: string;
  next_step: string;
}

export interface ResetPasswordBody {
  email: string;
  new_password: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  onboarding_status: string;
  onboarding_completed_at: string | null;
  created_at?: string | null;
  full_name?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  blood_type?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  phone?: string | null;
  address?: string | null;
  emergency_contacts?: Record<string, unknown>[] | null;
  medical_info?: Record<string, unknown> | null;
}

export interface UserProfileUpdate {
  full_name?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  blood_type?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  phone?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  emergency_contacts?: Record<string, unknown>[] | null;
  medical_info?: Record<string, unknown> | null;
  onboarding_completed?: boolean;
}
