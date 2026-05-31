import { z } from "zod";

type TranslateFn = (key: string) => string;

const nullableOptionalString = z.string().nullable().optional();

export function getProfileSchema(t: TranslateFn) {
  const nullablePhone = z
    .string()
    .nullable()
    .optional()
    .refine((v) => !v || /^[0-9+\-\s()]{7,20}$/.test(v), {
      message: t("validation.phoneInvalid"),
    });

  const nullableHeight = z
    .number()
    .min(50, { message: t("validation.heightMin") })
    .max(300, { message: t("validation.heightInvalid") })
    .nullable()
    .optional();

  const nullableWeight = z
    .number()
    .min(10, { message: t("validation.weightMin") })
    .max(500, { message: t("validation.weightInvalid") })
    .nullable()
    .optional();

  return z.object({
    full_name: z
      .string()
      .min(2, { message: t("validation.fullNameTooShort") })
      .max(100, { message: t("validation.fullNameTooLong") }),

    date_of_birth: nullableOptionalString,

    gender: z.enum(["male", "female", "other"]).nullable().optional(),

    blood_type: nullableOptionalString,

    height_cm: nullableHeight,

    weight_kg: nullableWeight,

    phone: nullablePhone,

    address: z
      .string()
      .max(512, { message: t("validation.addressTooLong") })
      .nullable()
      .optional(),

    emergency_contacts: z
      .array(
        z.object({
          name: z.string().min(1, { message: t("validation.ecNameRequired") }),
          relationship: z.string().min(1, { message: t("validation.ecRelationshipRequired") }),
          phone: z
            .string()
            .min(1, { message: t("validation.ecPhoneRequired") })
            .refine((v) => /^[0-9+\-\s()]{7,20}$/.test(v), {
              message: t("validation.phoneInvalid"),
            }),
        })
      )
      .default([]),

    medical_info: z
      .object({
        allergies: nullableOptionalString,
        chronic_conditions: nullableOptionalString,
        current_medications: nullableOptionalString,
        notes: nullableOptionalString,
        insurance: z
          .object({
            provider: z.string().min(1).max(128),
            policy_number: z.string().min(1).max(128),
            group_number: z.string().max(128).nullable().optional(),
          })
          .nullable()
          .optional(),
      })
      .optional(),
  });
}

// Static schema for type inference only (messages don't matter for types)
const _staticSchema = getProfileSchema((k) => k);
export type ProfileFormValues = z.infer<typeof _staticSchema>;
