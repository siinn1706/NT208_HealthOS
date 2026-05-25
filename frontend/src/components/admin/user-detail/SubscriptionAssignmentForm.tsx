"use client";

/**
 * SubscriptionAssignmentForm.tsx
 *
 * Form for assigning or updating a user's subscription from the admin
 * user detail page.
 *
 * Fields:
 * - plan_code   — select from PLAN_CODES
 * - status      — select from SUBSCRIPTION_STATUSES
 * - expires_at  — optional datetime-local input (ISO 8601)
 * - admin_note  — optional textarea, max 500 chars
 *
 * Validation is driven by `assignSubscriptionBodySchema` (Zod) via
 * react-hook-form + @hookform/resolvers/zod.
 *
 * Submit is disabled until the form is valid (R8.9).
 * Per-field validation messages are shown below each field (R8.9).
 * On server error the form keeps values and shows an error indication (R8.8).
 *
 * Requirements: 8.4, 8.5, 8.8, 8.9
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  PLAN_CODES,
  SUBSCRIPTION_STATUSES,
  assignSubscriptionBodySchema,
} from "@/lib/admin/admin-validation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssignSubscriptionBody = z.infer<typeof assignSubscriptionBodySchema>;

export interface SubscriptionAssignmentFormProps {
  /** The user ID whose subscription is being assigned. */
  userId: string;
  /** Pre-fills the form with the user's current subscription values. */
  currentSubscription?: { plan_code?: string; status?: string; expires_at?: string; admin_note?: string } | null;
  /** Called with the validated form data when the user submits. */
  onSubmit: (data: AssignSubscriptionBody) => void;
  /** Whether a submission is currently in flight. */
  isSubmitting: boolean;
  /** Server-side error message to display, or null when there is none. */
  error: string | null;
  /** Called after a successful quick-action mutation so the form can stay in sync. */
  onMutated?: () => void;
}

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

const PLAN_CODE_LABELS: Record<(typeof PLAN_CODES)[number], string> = {
  free: "Free (Miễn phí)",
  basic: "Basic (Cơ bản)",
  family: "Family (Gia đình)",
  professional: "Professional (Chuyên nghiệp)",
};

const SUBSCRIPTION_STATUS_LABELS: Record<
  (typeof SUBSCRIPTION_STATUSES)[number],
  string
> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
  expired: "Expired",
};

// ---------------------------------------------------------------------------
// Sub-component: field error message
// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// SubscriptionAssignmentForm
// ---------------------------------------------------------------------------

/**
 * SubscriptionAssignmentForm
 *
 * Controlled form that validates locally via Zod before calling `onSubmit`.
 * The submit button is disabled while the form is invalid or while a
 * submission is in flight (R8.9).
 */
export function SubscriptionAssignmentForm({
  userId: _userId,
  currentSubscription,
  onSubmit,
  isSubmitting,
  error,
}: SubscriptionAssignmentFormProps) {
  const t = useTranslations("admin.userDetail.subscription");
  const tc = useTranslations("admin.common");
  const defaultValues: Partial<AssignSubscriptionBody> = {
    plan_code: (currentSubscription?.plan_code as AssignSubscriptionBody["plan_code"]) ?? undefined,
    status: (currentSubscription?.status as AssignSubscriptionBody["status"]) ?? undefined,
    expires_at: currentSubscription?.expires_at ?? undefined,
    admin_note: currentSubscription?.admin_note ?? "",
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<AssignSubscriptionBody>({
    resolver: zodResolver(assignSubscriptionBodySchema),
    mode: "onChange",
    defaultValues,
  });

  return (
    <section
      aria-labelledby="subscription-form-heading"
      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6"
    >
      <h2
        id="subscription-form-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]"
      >
        {t("assignTitle")}
      </h2>

      {/* Server-side error (R8.8) */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        {/* ── plan_code ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="plan_code">
            {t("plan")} <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Controller
            name="plan_code"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="plan_code"
                  className="w-full"
                  aria-invalid={!!errors.plan_code}
                  aria-describedby={
                    errors.plan_code ? "plan_code-error" : undefined
                  }
                >
                  <SelectValue placeholder={t("selectPlan")} />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {PLAN_CODE_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError
            message={errors.plan_code?.message}
          />
          {errors.plan_code && (
            <span id="plan_code-error" className="sr-only">
              {errors.plan_code.message}
            </span>
          )}
        </div>

        {/* ── status ────────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="status">
            {t("status")} <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="status"
                  className="w-full"
                  aria-invalid={!!errors.status}
                  aria-describedby={
                    errors.status ? "status-error" : undefined
                  }
                >
                  <SelectValue placeholder={t("selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUBSCRIPTION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.status?.message} />
          {errors.status && (
            <span id="status-error" className="sr-only">
              {errors.status.message}
            </span>
          )}
        </div>

        {/* ── expires_at (optional) ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="expires_at">
            {t("expiresAt")}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {t("expiresOptional")}
            </span>
          </Label>
          <Input
            id="expires_at"
            type="datetime-local"
            aria-invalid={!!errors.expires_at}
            aria-describedby={
              errors.expires_at ? "expires_at-error" : undefined
            }
            className={cn(
              errors.expires_at && "border-destructive focus-visible:ring-destructive/50",
            )}
            {...register("expires_at", {
              // Convert the datetime-local value to a full ISO 8601 string
              // with timezone offset so Zod's .datetime({ offset: true }) accepts it.
              setValueAs: (v: string) => {
                if (!v) return undefined;
                // datetime-local gives "YYYY-MM-DDTHH:mm" — append ":00Z" if no offset
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
                  return v + ":00Z";
                }
                return v;
              },
            })}
          />
          <FieldError message={errors.expires_at?.message} />
          {errors.expires_at && (
            <span id="expires_at-error" className="sr-only">
              {errors.expires_at.message}
            </span>
          )}
        </div>

        {/* ── admin_note (optional) ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="admin_note">
            {t("noteLabel")}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {t("noteHint")}
            </span>
          </Label>
          <Textarea
            id="admin_note"
            placeholder={t("notePlaceholder")}
            maxLength={500}
            rows={3}
            aria-invalid={!!errors.admin_note}
            aria-describedby={
              errors.admin_note ? "admin_note-error" : undefined
            }
            className={cn(
              errors.admin_note && "border-destructive focus-visible:ring-destructive/50",
            )}
            {...register("admin_note")}
          />
          <FieldError message={errors.admin_note?.message} />
          {errors.admin_note && (
            <span id="admin_note-error" className="sr-only">
              {errors.admin_note.message}
            </span>
          )}
        </div>

        {/* ── Submit + Reset ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="sm:w-auto"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? tc("submitting") : t("assignButton")}
          </Button>
          {currentSubscription && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset(defaultValues)}
              disabled={isSubmitting}
              className="sm:w-auto"
            >
              {t("resetButton")}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
