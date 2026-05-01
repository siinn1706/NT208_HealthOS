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
  emergency_contacts?: Array<Record<string, unknown>> | null;
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
  emergency_contacts?: Array<Record<string, unknown>> | null;
  medical_info?: Record<string, unknown> | null;
  onboarding_completed?: boolean;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  onboarding_status: string;
}

export interface KpiValue {
  current: number | null;
  target: number | null;
}

export interface DashboardGoal {
  id: string;
  key: string;
  current: number | null;
  target: number | null;
  unit: string;
}

export interface DashboardAiInsight {
  text: string;
  category: string | null;
  insight_code: string | null;
  insight_params: Record<string, unknown> | null;
}

export interface DashboardSummary {
  user_name: string;
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    alert_code: string | null;
    alert_params: Record<string, unknown> | null;
  }>;
  kpis: Record<string, KpiValue>;
  goals: DashboardGoal[];
  ai_insight: DashboardAiInsight | null;
}

export interface VitalPoint {
  date: string;
  heart_rate: number | null;
  systolic: number | null;
  diastolic: number | null;
}

export interface Reminder {
  id: string;
  title: string;
  type: string;
  due_at?: string | null;
  next_occurrence_at?: string | null;
  done?: boolean;
}

export type AppointmentStatus =
  | 'booked'
  | 'scheduled'
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string | null;
}

export interface Prescription {
  id: string;
  issued_at: string | null;
  doctor: string | null;
  clinic: string | null;
  diagnosis: string | null;
  medicines: PrescriptionMedicine[];
  notes: string | null;
}

export interface Appointment {
  id: string;
  appointment_date: string;
  doctor_name: string;
  specialty: string | null;
  clinic: string | null;
  diagnosis: string | null;
  status: AppointmentStatus;
  notes: string | null;
  has_prescription: boolean;
  prescription: Prescription | null;
}

export interface AppointmentCreateBody {
  appointment_date: string;
  doctor_name: string;
  specialty?: string | null;
  clinic?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export type MedicationStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type MedicationForm = 'tablet' | 'capsule' | 'liquid' | 'injection' | 'drops' | 'other';

export interface MedicationDoseSummary {
  reminder_id: string;
  time: string;
  repeat: 'once' | 'daily' | 'weekly' | 'monthly';
  weekday_mask: number | null;
  day_of_month: number | null;
  next_occurrence_at: string | null;
  is_active: boolean;
}

export interface MedicationPlan {
  id: string;
  name: string;
  generic_name: string | null;
  strength: string | null;
  form: MedicationForm | null;
  instructions: string | null;
  prescriber: string | null;
  clinic: string | null;
  start_date: string;
  end_date: string | null;
  status: MedicationStatus;
  tzid: string;
  refill_supply_units: number | null;
  refill_cadence_days: number | null;
  last_refill_at: string | null;
  next_refill_estimated_at: string | null;
  review_due_at: string | null;
  appointment_id: string | null;
  notes: string | null;
  dose_count: number;
  next_dose_at: string | null;
}

export interface MedicationPlanDetail extends MedicationPlan {
  doses: MedicationDoseSummary[];
}

export interface MedicationPlanCreateBody {
  name: string;
  generic_name?: string | null;
  strength?: string | null;
  form?: MedicationForm | null;
  instructions?: string | null;
  prescriber?: string | null;
  clinic?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  tzid?: string | null;
  dose_times: string[];
  repeat: 'once' | 'daily' | 'weekly' | 'monthly';
  refill_supply_units?: number | null;
  refill_cadence_days?: number | null;
  review_due_at?: string | null;
  notes?: string | null;
  appointment_id?: string | null;
}

export interface MedicationDose {
  occurrence_id: string;
  reminder_id: string;
  medication_plan_id: string;
  plan_name: string;
  strength: string | null;
  scheduled_at: string;
  status: string;
}

export interface Adherence {
  period_days: number;
  scheduled: number;
  taken: number;
  skipped: number;
  missed: number;
  snoozed_pending: number;
  pending: number;
  percent: number;
}

export interface ConversationParticipant {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  role: string;
  is_system: boolean;
}

export type ConversationType = 'direct' | 'group' | 'ai';
export type MessageContentType = 'text' | 'image' | 'file' | 'audio' | 'system';
export type MessageSenderKind = 'user' | 'ai' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  sender_kind: MessageSenderKind;
  client_message_id: string | null;
  content: string;
  content_type: MessageContentType;
  attachments: Array<Record<string, unknown>> | null;
  reply_to_id: string | null;
  is_recalled: boolean;
  reactions: Array<Record<string, unknown>>;
  is_pinned: boolean;
  created_at: string;
  edited_at: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  avatar_url: string | null;
  participants: ConversationParticipant[];
  last_message: Message | null;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  theme_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageListResponse {
  data: Message[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface UserPreference {
  theme_mode: 'system' | 'light' | 'dark';
  accent_color: string | null;
  locale: 'en' | 'vi';
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
