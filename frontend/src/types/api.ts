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
