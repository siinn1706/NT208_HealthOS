/**
 * BFF / API shared TypeScript types.
 * Keep in sync with contracts/openapi/bff-api.yaml and core-api.yaml.
 */

// ─── Common ────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: ApiError;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface DataResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Users ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  onboarding_status: string;
  onboarding_completed_at: string | null;
  created_at: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
}

export interface MedicalInfo {
  allergies: string | null;
  chronic_conditions: string | null;
  current_medications: string | null;
  notes: string | null;
}

export interface UserProfile extends User {
  full_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  blood_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  phone: string | null;
  address: string | null;
  emergency_contacts: EmergencyContact[];
  medical_info: MedicalInfo;
}

/** Fields accepted by PATCH /v1/users/me — must stay in sync with BE UserProfileUpdate schema. */
export interface UserProfileUpdate {
  full_name?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | null;
  blood_type?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  phone?: string | null;
  address?: string | null;
  /** Public http(s) URL; omit when uploading via POST /users/me/avatar */
  avatar_url?: string | null;
  emergency_contacts?: EmergencyContact[] | null;
  medical_info?: MedicalInfo | null;
}

// ─── Meals ──────────────────────────────────────────────────────────

export type MealStatus = "pending" | "processing" | "analyzed" | "failed";

export interface NutritionResult {
  dish_name?: string;
  serving_type?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  saturates_g?: number;
  sugar_g?: number;
  salt_g?: number;
  confidence: number;
  source?: string;
}

/** A single ingredient entry within a meal */
export interface MealIngredient {
  ingredient_name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_custom: boolean; // true when user typed manually without matching DB
}

export interface Meal {
  id: string;
  name: string;
  status: MealStatus;
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: MealIngredient[];
  nutrition_result?: NutritionResult;
  logged_at: string;
  created_at: string;
}

// ─── Ingredients ────────────────────────────────────────────────────

export type IngredientCategory =
  | "grain"
  | "meat"
  | "seafood"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "oil_sauce"
  | "other";

export interface IngredientItem {
  id: string;
  name_vi: string;
  name_en: string;
  category: IngredientCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  unit_hint: string; // e.g. "gram", "ml", "thìa canh"
}

// ─── Nutrition ──────────────────────────────────────────────────────

export type NutritionSuggestionType = "warning" | "tip" | "goal" | "success";

export interface NutritionSuggestion {
  id: string;
  type: NutritionSuggestionType;
  icon: string; // lucide icon name
  title: string;
  message: string;
  message_params?: Record<string, number>;
  priority: number; // lower = higher priority
  cta?: { label: string; href: string };
}

export interface DailyNutritionSummary {
  date: string; // ISO date yyyy-MM-dd
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  calorie_target: number;
  meals: Meal[];
}

export interface WeeklyCaloriePoint {
  date: string; // MM-DD formatted
  full_date: string; // yyyy-MM-dd
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  target: number;
}

// ─── Health Metrics ─────────────────────────────────────────────────

export type MetricType =
  | "heart_rate"
  | "steps"
  | "sleep_minutes"
  | "weight_kg"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic";

export type WearableSource = "manual" | "apple_health" | "google_fit" | "garmin" | "fitbit";

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  recorded_at: string;
  source: WearableSource;
}

// ─── Analytics ─────────────────────────────────────────────────────

export type AggregationPeriod = "daily" | "weekly" | "monthly";

export interface AggregationPoint {
  date: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  count: number;
}

export interface AggregationResponse {
  data: AggregationPoint[];
}

export interface ComparisonPoint {
  date: string;
  values: Record<string, number | null>;
}

export interface ComparisonResponse {
  data: ComparisonPoint[];
}

export interface GoalProgressPoint {
  date: string;
  value: number;
  target: number;
  progress_percent: number;
}

export interface GoalProgressResponse {
  data: GoalProgressPoint[];
}

export interface PeriodStats {
  period: "current" | "previous";
  avg_value: number;
  min_value: number;
  max_value: number;
  total_value: number;
  count: number;
  trend: "improving" | "declining" | "stable";
}

export interface PeriodComparisonResponse {
  data: {
    current: PeriodStats;
    previous: PeriodStats;
    change_percent: number;
  };
}

// ─── Devices ────────────────────────────────────────────────────────

export type WearableProvider = "apple_health" | "google_fit" | "garmin" | "fitbit";

export interface ConnectedDevice {
  id: string;
  provider: WearableProvider;
  connected_at: string;
  last_synced_at?: string;
}

// ─── Appointments ────────────────────────────────────────────────────

export type AppointmentStatus = "completed" | "upcoming" | "cancelled";

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  issuedAt: string;
  doctor: string;
  clinic: string;
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  notes: string | null;
}

export interface Appointment {
  id: string;
  date: string;
  doctorName: string;
  specialty: string;
  clinic: string;
  diagnosis: string;
  status: AppointmentStatus;
  hasPrescription: boolean;
  prescription?: Prescription | null;
  notes?: string;
}

// ─── Risk Predictions ────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type RiskTrend = "improving" | "stable" | "worsening";

export interface RiskFactor {
  label: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}

export interface PreventionTip {
  id: string;
  category: "diet" | "exercise" | "medication" | "monitoring" | "lifestyle";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface RiskItem {
  id: string;
  condition: string;
  conditionVi: string;
  conditionCode: string;
  probability: number;
  level: RiskLevel;
  trend: RiskTrend;
  factors: RiskFactor[];
  tips: PreventionTip[];
  icdCode?: string;
}

export interface RiskPredictionSummary {
  generatedAt: string;
  overallScore: number;
  risks: RiskItem[];
  disclaimer: string;
}

// ─── Notifications ──────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

// ─── Plans ──────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  price_usd: number;
  features?: string[];
}

// ─── WebSocket events ────────────────────────────────────────────────

export interface WsEvent<T = unknown> {
  event: string;
  payload: T;
  timestamp: string;
}

// ─── Chat ────────────────────────────────────────────────────────────

export type ConversationType = "direct" | "group" | "ai";
export type MessageType = "text" | "image" | "file" | "audio" | "system";
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed" | "streaming";
export type ConversationTab = "all" | "strangers";
export type StrangerRequestStatus = "pending" | "accepted" | "rejected" | "blocked";
export type ChatThemeType = "gradient" | "pattern";

export interface ChatParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
  is_online: boolean;
  last_seen: string | null;
  /** Backend conversation_member role: "owner" | "member" | "admin" | "assistant". */
  role?: string;
  /** True for system bot accounts (e.g. HealthOS AI Assistant). */
  is_system?: boolean;
}

export interface MessageReaction {
  emoji: string;
  user_ids: string[];
  user_names?: Record<string, string>;
}

export interface MessageAttachment {
  url: string;
  name: string;
  size: number;
  mime_type: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_display_name?: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  reply_to?: Pick<Message, "id" | "content" | "sender_id" | "type" | "sender_display_name">;
  reactions: MessageReaction[];
  attachments?: MessageAttachment[] | null;
  is_edited: boolean;
  is_recalled: boolean;
  is_pinned: boolean;
  created_at: string;
  edited_at?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  avatar_url?: string | null;
  participants: ChatParticipant[];
  last_message?: {
    id?: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: MessageType;
    is_recalled: boolean;
  };
  is_pinned: boolean;
  is_muted: boolean;
  unread_count: number;
  theme_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrangerRequest {
  id: string;
  from_user: ChatParticipant;
  message_preview: string;
  status: StrangerRequestStatus;
  created_at: string;
}

export interface ChatTheme {
  id: string;
  name: string;
  type: ChatThemeType;
  url: string;
}

/** Gradient layer — pure CSS, no image files */
export interface ChatGradient {
  id: string;           // "none" | "grad-*"
  name: string;
  css: string;          // CSS `background` value, empty string for id==="none"
  type: "light" | "dark"; // determines which SVG variant to use over this gradient
}

/** Pattern layer — SVG repeat tile */
export interface ChatPattern {
  id: string;           // "none" | "pat-*"
  name: string;
  /** Canonical filename (no hash), e.g. "Theme_Cats.svg". Empty string for id==="none". */
  filename: string;
  /** Whether a light-mode (black-stroke) variant exists in /patterns/light/. */
  hasLight: boolean;
}

export type ChatWsEventType =
  | "chat.message.sent"
  | "chat.message.edited"
  | "chat.message.recalled"
  | "chat.message.reacted"
  | "chat.message.pinned"
  | "chat.message.unpinned"
  | "chat.message.read"
  | "chat.typing"
  | "conversation.updated"
  | "user.status";

export interface ChatWsEvent<T = unknown> extends WsEvent<T> {
  event: ChatWsEventType;
}

export interface SendMessagePayload {
  conversation_id: string;
  content: string;
  type: MessageType;
  reply_to_id?: string;
}

export interface EditMessagePayload {
  content: string;
}

export interface ReactMessagePayload {
  emoji: string;
}

// ─── Reports ─────────────────────────────────────────────────────────

export type ReportPeriod = "7d" | "30d" | "90d";
export type HealthStatus = "normal" | "warning" | "critical";
export type ReportCategory =
  | "vitals"
  | "nutrition"
  | "activity"
  | "sleep"
  | "bmi"
  | "medication";
export type TrendDirection = "improving" | "stable" | "declining";

export interface TimeseriesPoint {
  date: string; // ISO date yyyy-MM-dd
  value: number;
  value2?: number; // for dual-series (e.g. systolic/diastolic)
  value3?: number;
  label?: string;
}

export interface SectionStats {
  average: number;
  min: number;
  max: number;
  trend: TrendDirection;
  change_percent: number; // positive = up, negative = down
  unit: string;
}

export interface ReportAlert {
  id: string;
  severity: "critical" | "warning";
  metric: string;
  message: string;
  value: number;
  threshold: number;
  unit: string;
  timestamp: string;
}

export interface ReportSection {
  category: ReportCategory;
  title: string;
  summary: string;
  status: HealthStatus;
  data: TimeseriesPoint[];
  stats: SectionStats;
  alerts: ReportAlert[];
}

export interface HealthReport {
  id: string;
  user_id: string;
  period: ReportPeriod;
  generated_at: string;
  status: HealthStatus; // overall worst status across sections
  sections: ReportSection[];
  alerts: ReportAlert[]; // all alerts flattened
}

export interface AnomalyPoint {
  date: string;
  value: number;
  deviation_percent: number;
  severity: "critical" | "warning";
}

export interface TrendAnalysis {
  metric: string;
  metric_label: string;
  unit: string;
  period: ReportPeriod;
  data_points: TimeseriesPoint[];
  trend_line: number[]; // one value per data point (linear regression)
  prediction: number[]; // next 7 days predicted values
  anomalies: AnomalyPoint[];
  trend: TrendDirection;
  change_percent: number;
  ai_summary: string;
}

// ─── Share / Notifications ────────────────────────────────────────────────

export interface ShareRecipient {
  name: string;
  email: string;
  relationship?: string;
  user_id?: string;
}

export type ShareChannel = "email" | "in_app";

export interface ShareRequest {
  report_id: string;
  recipients: ShareRecipient[];
  channels: ShareChannel[];
  message?: string;
  include_pdf: boolean;
}

export type ShareStatus = "sent" | "failed" | "pending";

export interface ShareResult {
  recipient: ShareRecipient;
  channel: ShareChannel;
  status: ShareStatus;
  error_message?: string;
}

export interface AutoShareSettings {
  enabled: boolean;
  severity_threshold: "critical" | "warning_and_critical";
  default_recipients: ShareRecipient[];
  default_channels: ShareChannel[];
  countdown_seconds: number; // delay before auto-sending
}

// ─── User Preferences ────────────────────────────────────────────────

export interface UserPreference {
  theme_mode: "system" | "light" | "dark";
  accent_color: string | null;
}
