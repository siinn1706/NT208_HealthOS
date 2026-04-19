/**
 * Locks down every centralized validator against the backend Pydantic
 * constraints they mirror. If a backend rule changes, the matching test
 * here should fail and force a re-sync.
 *
 * Source map:
 *   passwordSchema           → backend/app/services/password_validator.py
 *   emailSchema              → standard RFC + Pydantic EmailStr
 *   otpSchema                → backend/app/schemas/auth.py:VerifyOtpBody
 *   usernameSchema           → backend/app/services/auth.py:validate_username
 *   phoneSchema              → backend/app/schemas/auth.py:UserProfileUpdate.validate_phone
 *   reminderCreateSchema     → backend/app/schemas/reminders.py:ReminderCreateBody
 *   appointmentCreateSchema  → backend/app/schemas/appointments.py:AppointmentCreateBody
 *   validateMetricValue      → backend/app/schemas/health_metrics.py:HealthMetricCreate.validate_medical_range
 *   messageContentSchema     → backend/app/schemas/chat.py:SendMessageBody
 *   reactionEmojiSchema      → backend/app/ws/chat_router.py + ReactMessageBody
 *   deleteAccountSchema      → backend/app/api/v1/endpoints/users.py:DeleteAccountBody
 *   groupConversationSchema  → backend/app/schemas/chat.py:CreateGroupConversationBody
 */
import {
  appointmentCreateSchema,
  deleteAccountSchema,
  emailSchema,
  groupConversationSchema,
  messageContentSchema,
  METRIC_RANGES,
  otpSchema,
  passwordSchema,
  phoneSchema,
  reactionEmojiSchema,
  reminderCreateSchema,
  utf8ByteLength,
  usernameSchema,
  validateMetricValue,
  validatePasswordStrength,
} from "@/validators";

describe("password validation (mirrors password_validator.py)", () => {
  it("rejects passwords below 8 chars", () => {
    expect(passwordSchema.safeParse("Aa1!").success).toBe(false);
  });
  it("requires uppercase + lowercase + digit + special", () => {
    expect(passwordSchema.safeParse("alllower1!").success).toBe(false);
    expect(passwordSchema.safeParse("ALLUPPER1!").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigits!!").success).toBe(false);
    expect(passwordSchema.safeParse("NoSpecial1").success).toBe(false);
  });
  it("accepts a password meeting every rule", () => {
    expect(passwordSchema.safeParse("Str0ngP@ss").success).toBe(true);
  });
  it("flags blacklisted passwords as 'too common'", () => {
    // The blacklist matches the lowercased input. "Password" lowercases to
    // "password" which is in the blacklist; complexity rules also fire.
    const errors = validatePasswordStrength("password");
    expect(errors.some((m) => /too common/i.test(m))).toBe(true);
  });
  it("rejects passwords longer than 128 chars", () => {
    expect(passwordSchema.safeParse(`A1!${"a".repeat(126)}`).success).toBe(false);
  });
});

describe("email + OTP", () => {
  it("rejects malformed emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("missing@tld").success).toBe(false);
  });
  it("accepts well-formed emails", () => {
    expect(emailSchema.safeParse("a@b.co").success).toBe(true);
  });
  it("OTP requires exactly 6 digits", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("1234567").success).toBe(false);
    expect(otpSchema.safeParse("12345a").success).toBe(false);
    expect(otpSchema.safeParse("123456").success).toBe(true);
  });
});

describe("username", () => {
  it("requires 3-64 chars and the documented charset", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("ali").success).toBe(true);
    expect(usernameSchema.safeParse("ali-bob_42.x").success).toBe(true);
    expect(usernameSchema.safeParse("ali bob").success).toBe(false);
    expect(usernameSchema.safeParse("ali!").success).toBe(false);
  });
});

describe("phone (mirrors UserProfileUpdate.validate_phone)", () => {
  it("accepts the documented format", () => {
    expect(phoneSchema.safeParse("0901234567").success).toBe(true);
    expect(phoneSchema.safeParse("+84 901-234-567").success).toBe(true);
    expect(phoneSchema.safeParse("+1 (555) 123-4567").success).toBe(true);
  });
  it("rejects junk", () => {
    expect(phoneSchema.safeParse("abc").success).toBe(false);
    expect(phoneSchema.safeParse("123").success).toBe(false);
    expect(phoneSchema.safeParse("").success).toBe(false);
  });
});

describe("reminder create (mirrors ReminderCreateBody)", () => {
  const valid = {
    type: "medicine" as const,
    title: "Aspirin",
    time: "08:00",
    repeat: "daily" as const,
  };
  it("accepts a minimal valid payload", () => {
    expect(reminderCreateSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects unknown type", () => {
    expect(
      reminderCreateSchema.safeParse({ ...valid, type: "haircut" }).success
    ).toBe(false);
  });
  it("rejects unknown repeat", () => {
    expect(
      reminderCreateSchema.safeParse({ ...valid, repeat: "yearly" }).success
    ).toBe(false);
  });
  it("rejects time without HH:MM format", () => {
    expect(
      reminderCreateSchema.safeParse({ ...valid, time: "8:00" }).success
    ).toBe(false);
    expect(
      reminderCreateSchema.safeParse({ ...valid, time: "08-00" }).success
    ).toBe(false);
  });
  it("rejects empty title", () => {
    expect(
      reminderCreateSchema.safeParse({ ...valid, title: "" }).success
    ).toBe(false);
  });
  it("rejects title longer than 255 chars", () => {
    expect(
      reminderCreateSchema.safeParse({ ...valid, title: "x".repeat(256) }).success
    ).toBe(false);
  });
  it("rejects note longer than 2000 chars", () => {
    expect(
      reminderCreateSchema.safeParse({ ...valid, note: "x".repeat(2001) }).success
    ).toBe(false);
  });
});

describe("appointment create (mirrors AppointmentCreateBody)", () => {
  const valid = {
    appointment_date: "2026-05-01T10:00:00Z",
    doctor_name: "Dr. House",
  };
  it("accepts minimal payload", () => {
    expect(appointmentCreateSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects empty doctor name", () => {
    expect(
      appointmentCreateSchema.safeParse({ ...valid, doctor_name: "" }).success
    ).toBe(false);
  });
  it("enforces backend max_length on each optional field", () => {
    expect(
      appointmentCreateSchema.safeParse({
        ...valid,
        specialty: "x".repeat(129),
      }).success
    ).toBe(false);
    expect(
      appointmentCreateSchema.safeParse({
        ...valid,
        clinic: "x".repeat(256),
      }).success
    ).toBe(false);
    expect(
      appointmentCreateSchema.safeParse({
        ...valid,
        reason: "x".repeat(513),
      }).success
    ).toBe(false);
    expect(
      appointmentCreateSchema.safeParse({
        ...valid,
        notes: "x".repeat(2001),
      }).success
    ).toBe(false);
  });
});

describe("health metric range (mirrors validate_medical_range)", () => {
  it("lists every backend metric type", () => {
    expect(Object.keys(METRIC_RANGES).sort()).toEqual([
      "blood_pressure_diastolic",
      "blood_pressure_systolic",
      "heart_rate",
      "sleep_minutes",
      "steps",
      "weight_kg",
    ]);
  });
  it("clamps heart rate to 20-300 bpm", () => {
    expect(validateMetricValue("heart_rate", 19)).not.toBeNull();
    expect(validateMetricValue("heart_rate", 60)).toBeNull();
    expect(validateMetricValue("heart_rate", 301)).not.toBeNull();
  });
  it("clamps weight to 1-500 kg", () => {
    expect(validateMetricValue("weight_kg", 0)).not.toBeNull();
    expect(validateMetricValue("weight_kg", 70)).toBeNull();
    expect(validateMetricValue("weight_kg", 501)).not.toBeNull();
  });
  it("returns null for unknown metric (defers to backend)", () => {
    expect(validateMetricValue("body_temperature", 37)).toBeNull();
  });
  it("rejects NaN", () => {
    expect(validateMetricValue("heart_rate", Number.NaN)).not.toBeNull();
  });
});

describe("chat message content (mirrors SendMessageBody)", () => {
  it("requires non-empty content", () => {
    expect(messageContentSchema.safeParse("").success).toBe(false);
  });
  it("caps at 4096 chars", () => {
    expect(messageContentSchema.safeParse("x".repeat(4097)).success).toBe(false);
    expect(messageContentSchema.safeParse("x".repeat(4096)).success).toBe(true);
  });
});

describe("reaction emoji (mirrors ReactMessageBody + WS handler)", () => {
  it("accepts a regular emoji", () => {
    expect(reactionEmojiSchema.safeParse("👍").success).toBe(true);
  });
  it("rejects HTML characters", () => {
    expect(reactionEmojiSchema.safeParse("<script>").success).toBe(false);
    expect(reactionEmojiSchema.safeParse("a&b").success).toBe(false);
  });
  it("rejects strings longer than 64 utf-8 bytes", () => {
    expect(reactionEmojiSchema.safeParse("👍".repeat(20)).success).toBe(false);
  });
  it("utf8ByteLength counts surrogate pairs as 4 bytes", () => {
    expect(utf8ByteLength("👍")).toBe(4);
    expect(utf8ByteLength("a")).toBe(1);
    expect(utf8ByteLength("é")).toBe(2);
    expect(utf8ByteLength("℃")).toBe(3);
  });
});

describe("delete account (mirrors DeleteAccountBody)", () => {
  it("requires a valid confirmation email", () => {
    expect(
      deleteAccountSchema.safeParse({ confirmation_email: "junk" }).success
    ).toBe(false);
  });
  it("caps password at 200 chars and reason at 500", () => {
    expect(
      deleteAccountSchema.safeParse({
        confirmation_email: "a@b.c",
        password: "x".repeat(201),
      }).success
    ).toBe(false);
    expect(
      deleteAccountSchema.safeParse({
        confirmation_email: "a@b.c",
        reason: "x".repeat(501),
      }).success
    ).toBe(false);
  });
});

describe("group conversation (mirrors CreateGroupConversationBody)", () => {
  it("requires a title and at least one member", () => {
    expect(
      groupConversationSchema.safeParse({ title: "", member_ids: ["u1"] }).success
    ).toBe(false);
    expect(
      groupConversationSchema.safeParse({ title: "g", member_ids: [] }).success
    ).toBe(false);
    expect(
      groupConversationSchema.safeParse({ title: "g", member_ids: ["u1"] }).success
    ).toBe(true);
  });
});
