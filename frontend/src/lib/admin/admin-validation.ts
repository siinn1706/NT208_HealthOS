// admin-validation.ts — Zod schemas for BFF query/body validation
// Requirements: 3.2, 3.4, 3.8
import { z, ZodError } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PLAN_CODES = ["free", "basic", "family", "professional"] as const;

export const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "expired",
] as const;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function isJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/users — query parameters (Requirement 3.2) */
export const usersListQuerySchema = z.object({
  search: z.string().max(200).optional().default(""),
  status: z.enum(["all", "active", "banned", "deleted"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

/** POST /api/v1/admin/users/[id]/ban — request body (Requirement 3.4) */
export const banBodySchema = z.object({
  reason: z
    .string()
    .transform((s) => s.trim())
    .refine(
      (s) => s.length >= 1 && s.length <= 500,
      "Ban_Reason must be between 1 and 500 characters",
    ),
});

/** PUT /api/v1/admin/users/[id]/subscription — request body (Requirement 3.8) */
export const assignSubscriptionBodySchema = z.object({
  plan_code: z.enum(PLAN_CODES),
  status: z.enum(SUBSCRIPTION_STATUSES),
  expires_at: z.iso.datetime({ offset: true }).optional(),
  admin_note: z.string().max(500).optional(),
});

/** PATCH /api/v1/admin/subscription-plans/[id] — request body (Requirement 3.8) */
export const planPatchSchema = z.object({
  is_active: z.boolean().optional(),
  is_recommended: z.boolean().optional(),
  price_vnd: z.number().int().min(0).max(1_000_000_000_000).optional(),
  description: z.string().max(1000).optional(),
  features: z
    .string()
    .max(8 * 1024)
    .refine(isJson, "features must be valid JSON")
    .optional(),
  limits: z
    .string()
    .max(8 * 1024)
    .refine(isJson, "limits must be valid JSON")
    .optional(),
});

// ---------------------------------------------------------------------------
// Error response helper
// ---------------------------------------------------------------------------

/**
 * Maps a ZodError to the standard BFF validation error response shape.
 * HTTP 400 callers should return this as the response body.
 */
export function validationErrorResponse(zodError: ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR" as const,
      details: zodError.issues,
    },
  };
}
