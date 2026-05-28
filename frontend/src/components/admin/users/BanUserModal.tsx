"use client";

/**
 * BanUserModal.tsx
 *
 * Modal dialog for banning a user. The admin must supply a non-empty reason
 * (1–500 characters after trimming) before the submit button is enabled.
 *
 * Props:
 *   - userId:       the ID of the user being banned (null when modal is closed)
 *   - isOpen:       controls Dialog open state
 *   - onClose:      called when the dialog should close (X button or Cancel)
 *   - onSubmit:     called with the trimmed reason when the form is submitted
 *   - isSubmitting: disables the submit button and shows a loading state
 *   - error:        server-side error message to display inside the modal
 *
 * The reason field is a controlled input so its value is preserved on failure
 * (Requirement 7.12).
 *
 * Requirements: 7.5, 7.6, 7.12, 11.1, 11.2, 11.3, 11.4
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const REASON_MIN = 1;
const REASON_MAX = 500;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BanUserModalProps {
  /** ID of the user to ban. When null the modal should not be open. */
  userId: string | null;
  /** Whether the dialog is open. */
  isOpen: boolean;
  /** Called when the dialog requests to close (Cancel or X). */
  onClose: () => void;
  /**
   * Called with the trimmed reason string when the admin submits the form.
   * The parent is responsible for calling the BFF and then closing the modal
   * on success.
   */
  onSubmit: (reason: string) => void;
  /** True while the ban POST is in flight — disables the submit button. */
  isSubmitting: boolean;
  /** Server-side error message to display inside the modal. Null when none. */
  error: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * BanUserModal
 *
 * Controlled dialog for banning a user. The submit button is disabled until
 * `reason.trim().length` is in [1, 500]. The reason value is preserved on
 * failure so the admin does not lose their input (R7.12).
 *
 * Validates: Requirements 7.5, 7.6, 7.12
 */
export function BanUserModal({
  userId,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: BanUserModalProps) {
  const t = useTranslations("admin.userDetail.ban");
  const tc = useTranslations("admin.common");
  // Controlled reason state — preserved across failed submissions (R7.12).
  const [reason, setReason] = React.useState("");

  // Reset reason when the modal opens for a new user.
  React.useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen, userId]);

  const trimmedReason = reason.trim();
  const isReasonValid =
    trimmedReason.length >= REASON_MIN && trimmedReason.length <= REASON_MAX;

  const remainingChars = REASON_MAX - reason.length;
  const isOverLimit = reason.length > REASON_MAX;

  const reasonId = React.useId();
  const errorId = React.useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReasonValid || isSubmitting) return;
    onSubmit(trimmedReason);
  }

  function handleOpenChange(open: boolean) {
    if (!open && !isSubmitting) {
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        // Prevent closing by clicking the overlay while submitting.
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        aria-describedby={error ? errorId : undefined}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Error banner */}
          {error && (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          {/* Reason field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>
              {t("reasonLabel")}{" "}
              <span className="text-muted-foreground font-normal">
                (required)
              </span>
            </Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={4}
              disabled={isSubmitting}
              aria-invalid={isOverLimit || undefined}
              aria-describedby={isOverLimit ? `${reasonId}-limit` : undefined}
              className={cn(
                "resize-none",
                isOverLimit && "border-destructive focus-visible:ring-destructive/50",
              )}
            />
            {/* Character counter */}
            <p
              id={`${reasonId}-limit`}
              className={cn(
                "text-right text-xs",
                isOverLimit
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {isOverLimit
                ? `${Math.abs(remainingChars)} characters over limit`
                : `${remainingChars} characters remaining`}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isReasonValid || isSubmitting}
              aria-disabled={!isReasonValid || isSubmitting}
            >
              {isSubmitting ? t("confirm") : t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
