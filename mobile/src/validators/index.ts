/**
 * Centralized form validators that mirror the backend Pydantic constraints.
 * Single source of truth — any backend rule change should land here so all
 * forms get the update at once.
 *
 * Cited backend sources:
 *  - Auth + profile shapes:     `backend/app/schemas/auth.py`
 *  - Password complexity:       `backend/app/services/password_validator.py`
 *  - Reminder fields:           `backend/app/schemas/reminders.py`
 *  - Appointment fields:        `backend/app/schemas/appointments.py`
 *  - Health metric ranges:      `backend/app/schemas/health_metrics.py:HealthMetricCreate`
 *  - Chat send body:            `backend/app/schemas/chat.py:SendMessageBody`
 *  - Account delete body:       `backend/app/api/v1/endpoints/users.py:DeleteAccountBody`
 *
 * NOTE: All messages are intentionally short and English-first; localized
 * variants live in `src/i18n/*.json` and screens read them by key. We keep
 * the validator messages as fallbacks the user sees when i18n hasn't been
 * threaded into the form yet.
 */
import { z } from "zod";

// ─── Password (mirrors password_validator.py:validate_password) ─────────────

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
const PASSWORD_SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

/**
 * Common-password blacklist — a representative subset (top of the backend
 * list); the full check still happens server-side via `validate_password`.
 * This mobile copy short-circuits the obvious cases so the user sees the
 * error before round-tripping.
 */
const PASSWORD_BLACKLIST = new Set([
  "password",
  "password1",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "abc123",
  "monkey",
  "letmein",
  "iloveyou",
  "admin",
  "admin123",
  "welcome",
  "matkhau",
  "matkhau123",
  "vietnam",
  "vietnam123",
  "saigon",
  "saigon123",
  "hanoi",
  "hanoi123",
  "healthos",
  "health",
  "health123",
  "hello",
  "test",
  "guest",
  "root",
  "passw0rd",
]);

export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];
  if (password.length < PASSWORD_MIN) {
    errors.push(`Use at least ${PASSWORD_MIN} characters.`);
  } else if (password.length > PASSWORD_MAX) {
    errors.push(`Use at most ${PASSWORD_MAX} characters.`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Add at least one uppercase letter (A-Z).");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Add at least one lowercase letter (a-z).");
  }
  if (!/\d/.test(password)) {
    errors.push("Add at least one digit (0-9).");
  }
  if (!PASSWORD_SPECIAL_REGEX.test(password)) {
    errors.push(`Add at least one special character (${PASSWORD_SPECIAL_CHARS}).`);
  }
  if (PASSWORD_BLACKLIST.has(password.toLowerCase())) {
    errors.push("This password is too common. Choose a stronger one.");
  }
  return errors;
}

export const passwordSchema = z
  .string()
  .min(1, { message: "Password is required." })
  .superRefine((value, ctx) => {
    for (const message of validatePasswordStrength(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  });

// ─── Email + OTP ────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .min(1, { message: "Email is required." })
  .email({ message: "Enter a valid email address." })
  .max(254, { message: "Email is too long." });

export const OTP_REGEX = /^\d{6}$/;
export const otpSchema = z
  .string()
  .regex(OTP_REGEX, { message: "Enter the 6-digit code." });

// ─── Username (mirrors backend `validate_username`) ─────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
export const usernameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters." })
  .max(64, { message: "Username is too long." })
  .regex(USERNAME_REGEX, {
    message: "Only letters, numbers, dot, dash and underscore.",
  });

// ─── Phone (mirrors UserProfileUpdate.validate_phone in auth.py) ────────────

const PHONE_REGEX = /^\+?[0-9][0-9\-\s()]{4,18}[0-9]$/;
export const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, { message: "Enter a valid phone number." });

export const optionalPhoneSchema = z
  .union([z.literal(""), phoneSchema])
  .optional();

// ─── Profile fields ─────────────────────────────────────────────────────────

export const fullNameSchema = z
  .string()
  .min(1, { message: "Name is required." })
  .max(255, { message: "Name is too long." });

export const heightCmSchema = z
  .number({ invalid_type_error: "Enter a number." })
  .gte(50, { message: "Height must be at least 50 cm." })
  .lte(300, { message: "Height must be at most 300 cm." });

export const weightKgSchema = z
  .number({ invalid_type_error: "Enter a number." })
  .gte(1, { message: "Weight must be at least 1 kg." })
  .lte(500, { message: "Weight must be at most 500 kg." });

export const bloodTypeSchema = z
  .string()
  .regex(/^(A|B|AB|O)[+-]$/i, { message: "Use A+, A-, B+, B-, AB+, AB-, O+, or O-." });

export const genderSchema = z.enum(["male", "female", "other"]);

export const avatarUrlSchema = z
  .string()
  .max(512, { message: "URL is too long." })
  .regex(/^https?:\/\//, { message: "URL must start with http:// or https://." });

// ─── Emergency contact (one entry in the array Pydantic expects) ────────────

export const emergencyContactSchema = z.object({
  name: z.string().min(1, { message: "Contact name is required." }).max(255),
  phone: phoneSchema,
  relationship: z.string().min(1).max(64),
  email: z.union([z.literal(""), emailSchema]).optional(),
});

// ─── Reminder (mirrors ReminderCreateBody) ──────────────────────────────────

export const reminderTypeSchema = z.enum(["medicine", "appointment", "exercise"]);
export const reminderRepeatSchema = z.enum([
  "once",
  "daily",
  "weekly",
  "monthly",
]);
export const reminderTitleSchema = z
  .string()
  .min(1, { message: "Title is required." })
  .max(255, { message: "Title is too long." });
export const reminderTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, {
  message: "Use HH:MM (e.g. 08:00).",
});
export const reminderNoteSchema = z
  .string()
  .max(2000, { message: "Note is too long." });

export const reminderCreateSchema = z.object({
  type: reminderTypeSchema,
  title: reminderTitleSchema,
  time: reminderTimeSchema,
  repeat: reminderRepeatSchema,
  note: reminderNoteSchema.optional(),
});

// ─── Appointment (mirrors AppointmentCreateBody) ────────────────────────────

export const appointmentCreateSchema = z.object({
  appointment_date: z.string().min(1, { message: "Date is required." }),
  doctor_name: z
    .string()
    .min(1, { message: "Doctor name is required." })
    .max(255, { message: "Doctor name is too long." }),
  specialty: z.string().max(128).optional(),
  clinic: z.string().max(255).optional(),
  reason: z.string().max(512).optional(),
  notes: z.string().max(2000).optional(),
});

// ─── Health metric (mirrors HealthMetricCreate.validate_medical_range) ──────

export const METRIC_RANGES: Record<
  string,
  { min: number; max: number; unit: string }
> = {
  heart_rate: { min: 20, max: 300, unit: "bpm" },
  steps: { min: 0, max: 200000, unit: "steps" },
  sleep_minutes: { min: 0, max: 1440, unit: "min" },
  weight_kg: { min: 1, max: 500, unit: "kg" },
  blood_pressure_systolic: { min: 50, max: 300, unit: "mmHg" },
  blood_pressure_diastolic: { min: 30, max: 200, unit: "mmHg" },
};

export function validateMetricValue(metric: string, value: number): string | null {
  const range = METRIC_RANGES[metric];
  if (!range) return null;
  if (Number.isNaN(value)) return "Enter a number.";
  if (value < range.min || value > range.max) {
    return `${metric.replace(/_/g, " ")} must be between ${range.min} and ${range.max} ${range.unit}.`;
  }
  return null;
}

// ─── Chat (mirrors SendMessageBody + ReactMessageBody) ──────────────────────

export const messageContentSchema = z
  .string()
  .min(1, { message: "Type a message." })
  .max(4096, { message: "Message is too long." });

/**
 * UTF-8 byte length without depending on Node's `Buffer` (not guaranteed in
 * React Native). Backend allows up to 64 bytes for a reaction emoji.
 */
export function utf8ByteLength(input: string): number {
  let bytes = 0;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i += 1; // surrogate pair
    } else bytes += 3;
  }
  return bytes;
}

export const reactionEmojiSchema = z
  .string()
  .min(1, { message: "Pick an emoji." })
  .refine((v) => utf8ByteLength(v) <= 64, {
    message: "Emoji is too long.",
  })
  .refine((v) => !/[<>&"']/.test(v), {
    message: "Reactions can't contain HTML characters.",
  });

// ─── Account delete (mirrors DeleteAccountBody) ─────────────────────────────

export const deleteAccountSchema = z.object({
  confirmation_email: emailSchema,
  password: z.string().max(200).optional(),
  reason: z.string().max(500).optional(),
});

// ─── Group conversation (mirrors CreateGroupConversationBody) ───────────────

export const groupConversationSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Group title is required." })
    .max(255, { message: "Title is too long." }),
  member_ids: z.array(z.string()).min(1, {
    message: "Add at least one member.",
  }),
  avatar_url: avatarUrlSchema.optional(),
});
