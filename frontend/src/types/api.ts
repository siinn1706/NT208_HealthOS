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
  display_name: string;
  created_at: string;
}

export interface EmergencyContact {
  id?: string;
  name: string | null;
  relationship: string | null;
  phone: string | null;
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
  avatar_url: string | null;
  emergency_contacts: EmergencyContact[];
  medical_info: MedicalInfo;
}

export type UserProfileUpdate = Omit<UserProfile, "id" | "email" | "created_at">;

// ─── Meals ──────────────────────────────────────────────────────────

export type MealStatus = "pending" | "processing" | "analyzed" | "failed";

export interface NutritionResult {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
}

export interface Meal {
  id: string;
  name: string;
  status: MealStatus;
  nutrition_result?: NutritionResult;
  logged_at: string;
  created_at: string;
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

// ─── Devices ────────────────────────────────────────────────────────

export type WearableProvider = "apple_health" | "google_fit" | "garmin" | "fitbit";

export interface ConnectedDevice {
  id: string;
  provider: WearableProvider;
  connected_at: string;
  last_synced_at?: string;
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
export type MessageType = "text" | "image" | "file" | "system";
export type MessageStatus = "sending" | "sent" | "delivered" | "read";
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
}

export interface MessageReaction {
  emoji: string;
  user_ids: string[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  reply_to?: Pick<Message, "id" | "content" | "sender_id" | "type">;
  reactions: MessageReaction[];
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
  | "message.new"
  | "message.edited"
  | "message.recalled"
  | "message.reacted"
  | "message.pinned"
  | "typing.start"
  | "typing.stop"
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
