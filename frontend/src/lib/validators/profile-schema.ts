import { z } from "zod";

const nullableOptionalString = z.string().nullable().optional();

const nullablePhone = z
  .string()
  .nullable()
  .optional()
  .refine((v) => !v || /^[0-9+\-\s()]{7,20}$/.test(v), {
    message: "Số điện thoại không hợp lệ.",
  });

const nullableHeight = z
  .number()
  .min(50, { message: "Chiều cao phải ít nhất 50 cm." })
  .max(300, { message: "Chiều cao không hợp lệ." })
  .nullable()
  .optional();

const nullableWeight = z
  .number()
  .min(10, { message: "Cân nặng phải ít nhất 10 kg." })
  .max(500, { message: "Cân nặng không hợp lệ." })
  .nullable()
  .optional();

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, { message: "Họ và tên phải có ít nhất 2 ký tự." })
    .max(100, { message: "Họ và tên không được vượt quá 100 ký tự." }),

  date_of_birth: nullableOptionalString,

  gender: z.enum(["male", "female", "other"]).nullable().optional(),

  blood_type: nullableOptionalString,

  height_cm: nullableHeight,

  weight_kg: nullableWeight,

  phone: nullablePhone,

  address: z
    .string()
    .max(200, { message: "Địa chỉ không được vượt quá 200 ký tự." })
    .nullable()
    .optional(),

  emergency_contacts: z
    .array(
      z.object({
        id: z.string().optional(),
        name: nullableOptionalString,
        relationship: nullableOptionalString,
        phone: nullablePhone,
      })
    )
    .default([]),

  medical_info: z
    .object({
      allergies: nullableOptionalString,
      chronic_conditions: nullableOptionalString,
      current_medications: nullableOptionalString,
      notes: nullableOptionalString,
    })
    .optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
