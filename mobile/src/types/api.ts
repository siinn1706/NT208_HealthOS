export type {
  AuthLoginResult,
  AuthToken,
  CurrentUser,
  DataResponse,
  InsuranceInfo,
  MedicalInfo,
  MfaLoginRequired,
  PaginatedResponse,
  PaginationMeta,
  UserProfileUpdate,
} from '../../../shared/api-contracts';

export interface OnboardingDraftPayload {
  data: Record<string, unknown>;
}

export interface OnboardingDraftData {
  data: Record<string, unknown>;
  updated_at: string;
  expires_at: string;
}

export interface OnboardingDraftResponse {
  data: OnboardingDraftData;
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

export type RequestOtpPurpose = 'signup' | 'reset_password' | 'login' | 'delete_account';
export type VerifyOtpPurpose = 'signup' | 'reset_password' | 'login' | 'delete_account';

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

export interface AccountDeletionRequestBody {
  confirmation_email: string;
  password?: string | null;
  otp_code?: string | null;
  reason?: string | null;
}

export interface AccountDeletionResult {
  status: 'pending_deletion';
  purge_at: string | null;
}

export interface AccountRestoreResult {
  status: 'active';
}

export type VisitType =
  | 'gp_routine'
  | 'specialist'
  | 'follow_up'
  | 'mental_health'
  | 'urgent_walkin'
  | 'pediatric_caregiver';

export type VisitBriefStatus = 'draft' | 'finalized' | 'archived';
export type ConcernCategory = 'pain' | 'fever' | 'gi' | 'resp' | 'mental' | 'skin' | 'neuro' | 'cardio' | 'other';
export type DurationUnit = 'hours' | 'days' | 'weeks' | 'months';
export type TriageBucket =
  | 'emergency_now'
  | 'urgent_same_day'
  | 'routine_gp'
  | 'self_care_with_monitoring'
  | 'insufficient_info';

export interface SymptomEntry {
  id: string;
  visit_brief_id: string;
  concern_text: string;
  concern_category: ConcernCategory;
  onset_date: string | null;
  duration_value: number | null;
  duration_unit: DurationUnit | null;
  severity_0_10: number | null;
  triggers: string | null;
  better_with: string | null;
  worse_with: string | null;
  meds_taken: string | null;
  prior_care: string | null;
  context: Record<string, unknown> | null;
  order_index: number;
}

export interface TriageOutcome {
  id: string;
  visit_brief_id: string;
  ruleset_version: string;
  bucket: TriageBucket;
  matched_signals: Record<string, unknown>[];
  inputs_hash: string;
  disclaimer_version: string;
  next_action_copy_key: string | null;
  computed_at: string;
}

export interface QuestionItem {
  id: string;
  source: 'template' | 'custom';
  text_vi: string;
  text_en: string;
  order: number;
  locked: boolean;
}

export interface QuestionSet {
  id: string;
  visit_brief_id: string;
  questions: QuestionItem[];
  updated_at: string;
}

export interface QuestionTemplate {
  id: string;
  slug: string;
  visit_type: VisitType | null;
  concern_category: ConcernCategory | null;
  text_vi: string;
  text_en: string;
  default_order: number;
  is_canonical: boolean;
}

export interface AppointmentBriefLink {
  id: string;
  visit_brief_id: string;
  appointment_id: string;
  is_active: boolean;
  attached_at: string;
  detached_at: string | null;
}

export interface VisitBrief {
  id: string;
  user_id: string;
  visit_type: VisitType;
  status: VisitBriefStatus;
  revision: number;
  title: string | null;
  finalized_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitBriefDetail extends VisitBrief {
  symptoms: SymptomEntry[];
  latest_triage: TriageOutcome | null;
  question_set: QuestionSet | null;
  appointment_links: AppointmentBriefLink[];
}
