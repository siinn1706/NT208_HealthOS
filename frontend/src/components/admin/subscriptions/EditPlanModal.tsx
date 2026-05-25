"use client";

// EditPlanModal.tsx — modal for editing a subscription plan's mutable fields
// Requirements: 9.3, 9.4, 9.5, 9.8, 9.9, 13.5

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { planPatchSchema } from "@/lib/admin/admin-validation";
import type { SubscriptionPlan } from "./PlansTable";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanPatchBody {
  is_active?: boolean;
  is_recommended?: boolean;
  price_vnd?: number;
  description?: string;
  features?: string;
  limits?: string;
}

interface EditPlanModalProps {
  plan: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PlanPatchBody) => void;
  isSubmitting: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonParseError(value: string): string | null {
  if (value.trim() === "") return null;
  try {
    JSON.parse(value);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid JSON";
  }
}

function stringifyJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal for editing the mutable fields of a subscription plan.
 *
 * Editable fields: is_active, is_recommended, price_vnd, description,
 * features (JSON), limits (JSON).
 *
 * - Inline JSON parse errors are shown for features/limits (R9.4).
 * - Submit is disabled while JSON is invalid or while submitting (R9.4).
 * - Only modified fields are included in the PATCH body (R9.5).
 * - On submission failure the modal stays open with input preserved (R9.8).
 */
export function EditPlanModal({
  plan,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: EditPlanModalProps) {
  // -------------------------------------------------------------------------
  // Local form state — initialised from `plan` whenever it changes
  // -------------------------------------------------------------------------
  const [isActive, setIsActive] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [priceVnd, setPriceVnd] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [limits, setLimits] = useState("");

  // Sync state when the plan prop changes (new plan opened) or modal closes
  useEffect(() => {
    if (!plan) {
      setIsActive(false);
      setIsRecommended(false);
      setPriceVnd("");
      setDescription("");
      setFeatures("");
      setLimits("");
      return;
    }
    setIsActive(plan.is_active);
    setIsRecommended(plan.is_recommended);
    setPriceVnd(String(plan.price_vnd));
    setDescription(plan.description ?? "");
    setFeatures(stringifyJson(plan.features));
    setLimits(stringifyJson(plan.limits));
  }, [plan]);

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  const featuresError = jsonParseError(features);
  const limitsError = jsonParseError(limits);

  const priceNum = parseInt(priceVnd, 10);
  const priceInvalid =
    priceVnd.trim() !== "" &&
    (isNaN(priceNum) || priceNum < 0 || priceNum > 1_000_000_000_000);

  const isFormInvalid =
    featuresError !== null || limitsError !== null || priceInvalid;

  // -------------------------------------------------------------------------
  // Submit — only send modified fields
  // -------------------------------------------------------------------------
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || isFormInvalid || isSubmitting) return;

    const patch: PlanPatchBody = {};

    if (isActive !== plan.is_active) patch.is_active = isActive;
    if (isRecommended !== plan.is_recommended)
      patch.is_recommended = isRecommended;

    const parsedPrice = parseInt(priceVnd, 10);
    if (!isNaN(parsedPrice) && parsedPrice !== plan.price_vnd)
      patch.price_vnd = parsedPrice;

    if (description !== (plan.description ?? ""))
      patch.description = description;

    const originalFeatures = stringifyJson(plan.features);
    if (features !== originalFeatures && features.trim() !== "")
      patch.features = features;

    const originalLimits = stringifyJson(plan.limits);
    if (limits !== originalLimits && limits.trim() !== "")
      patch.limits = limits;

    // Validate the patch body against the Zod schema before submitting
    const result = planPatchSchema.safeParse(patch);
    if (!result.success) return;

    onSubmit(result.data as PlanPatchBody);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Plan — {plan.name_en}</DialogTitle>
          <DialogDescription>
            Update the mutable fields for the{" "}
            <span className="font-medium">{plan.code}</span> plan. Only changed
            fields will be sent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* is_active */}
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="edit-is-active">Active</Label>
            <Switch
              id="edit-is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSubmitting}
            />
          </div>

          {/* is_recommended */}
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="edit-is-recommended">Recommended</Label>
            <Switch
              id="edit-is-recommended"
              checked={isRecommended}
              onCheckedChange={setIsRecommended}
              disabled={isSubmitting}
            />
          </div>

          {/* price_vnd */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-price-vnd">Price (VND)</Label>
            <Input
              id="edit-price-vnd"
              type="number"
              min={0}
              max={1_000_000_000_000}
              step={1}
              value={priceVnd}
              onChange={(e) => setPriceVnd(e.target.value)}
              disabled={isSubmitting}
              aria-invalid={priceInvalid}
              placeholder="e.g. 99000"
            />
            {priceInvalid && (
              <p className="text-xs text-destructive">
                Price must be an integer between 0 and 1,000,000,000,000.
              </p>
            )}
          </div>

          {/* description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              disabled={isSubmitting}
              placeholder="Plan description (max 1000 characters)"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          {/* features */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-features">Features (JSON)</Label>
            <Textarea
              id="edit-features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              disabled={isSubmitting}
              aria-invalid={featuresError !== null}
              placeholder='e.g. ["feature1", "feature2"]'
              rows={4}
              className="font-mono text-xs"
            />
            {featuresError && (
              <p className="text-xs text-destructive" role="alert">
                JSON error: {featuresError}
              </p>
            )}
          </div>

          {/* limits */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-limits">Limits (JSON)</Label>
            <Textarea
              id="edit-limits"
              value={limits}
              onChange={(e) => setLimits(e.target.value)}
              disabled={isSubmitting}
              aria-invalid={limitsError !== null}
              placeholder='e.g. {"max_users": 5}'
              rows={4}
              className="font-mono text-xs"
            />
            {limitsError && (
              <p className="text-xs text-destructive" role="alert">
                JSON error: {limitsError}
              </p>
            )}
          </div>

          {/* Server-side error */}
          {error && (
            <div
              className="rounded-lg bg-[var(--admin-status-danger-soft)] px-3 py-2 text-sm text-[var(--admin-status-danger)]"
              role="alert"
            >
              {error}
            </div>
          )}

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={isFormInvalid || isSubmitting}
              aria-disabled={isFormInvalid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
