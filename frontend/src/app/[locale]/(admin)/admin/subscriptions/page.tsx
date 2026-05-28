"use client";

/**
 * Admin Subscriptions Page
 *
 * Fetches the list of subscription plans from the BFF, renders them in a
 * table, and provides an edit modal for updating mutable plan fields.
 *
 * Requirements: 9.6, 9.8, 9.9
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { adminFetch } from "@/lib/admin/bff-admin-client";
import { retryGate } from "@/lib/admin/async-control";
import {
  PlansTable,
  type SubscriptionPlan,
} from "@/components/admin/subscriptions/PlansTable";
import {
  EditPlanModal,
  type PlanPatchBody,
} from "@/components/admin/subscriptions/EditPlanModal";
import { PlanMetricsStrip, type PlanMetrics } from "@/components/admin/subscriptions/plan-metrics-strip";
import { AdminErrorState } from "@/components/admin/shared/AdminErrorState";
import { AdminPageContent } from "@/components/admin/shared/admin-page-content";
import { AdminPageHeader } from "@/components/admin/shared/admin-page-header";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum consecutive retries before disabling the retry button (R10.5). */
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PlansTableSkeleton() {
  return (
    <div className="w-full space-y-2" aria-busy="true" aria-label="Loading plans">
      <Skeleton className="h-10 w-full rounded-xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AdminSubscriptionsPage() {
  // ── Fetch state ────────────────────────────────────────────────────────
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ── Retry gate ─────────────────────────────────────────────────────────
  const gateRef = useRef(retryGate(MAX_RETRIES));

  // ── Edit modal state ───────────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Plan metrics (optional — null when API doesn't surface per-plan counts) ──
  const planMetrics: PlanMetrics | null = null;

  // ── Fetch plans ────────────────────────────────────────────────────────

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await adminFetch<{ data: SubscriptionPlan[] }>(
        "/api/v1/admin/subscription-plans",
      );
      setPlans(response.data);
      gateRef.current.reset();
      setRetryCount(0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load subscription plans.";
      setFetchError(message);
      gateRef.current.recordAttempt();
      setRetryCount((c) => c + 1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  // ── Modal handlers ─────────────────────────────────────────────────────

  function openEditModal(plan: SubscriptionPlan) {
    setSelectedPlan(plan);
    setSubmitError(null);
    setIsModalOpen(true);
  }

  function closeEditModal() {
    if (isSubmitting) return; // prevent closing while a PATCH is in-flight
    setIsModalOpen(false);
    setSelectedPlan(null);
    setSubmitError(null);
  }

  async function handlePatch(data: PlanPatchBody) {
    if (!selectedPlan) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updated = await adminFetch<{ data: SubscriptionPlan }>(
        `/api/v1/admin/subscription-plans/${selectedPlan.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );

      // On success: close modal and update the row in local state (R9.9)
      setPlans((prev) =>
        prev.map((p) => (p.id === selectedPlan.id ? updated.data : p)),
      );
      setIsModalOpen(false);
      setSelectedPlan(null);
    } catch (err) {
      // On failure: keep modal open with preserved input and inline error (R9.8)
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save plan changes. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <AdminPageContent>
      {/* Page header */}
      <AdminPageHeader
        title="Subscription Plans"
        description="Manage the four canonical HealthOS subscription plans."
      />

      {/* Plan metrics strip — hidden when per-plan counts are unavailable */}
      <PlanMetricsStrip metrics={planMetrics} />

      {/* Loading state */}
      {isLoading && <PlansTableSkeleton />}

      {/* Error state */}
      {!isLoading && fetchError && (
        <AdminErrorState
          reason={fetchError}
          onRetry={fetchPlans}
          retriesLeft={MAX_RETRIES - retryCount}
        />
      )}

      {/* Plans table */}
      {!isLoading && !fetchError && (
        <PlansTable plans={plans} onEdit={openEditModal} />
      )}

      {/* Edit modal */}
      <EditPlanModal
        plan={selectedPlan}
        isOpen={isModalOpen}
        onClose={closeEditModal}
        onSubmit={handlePatch}
        isSubmitting={isSubmitting}
        error={submitError}
      />
    </AdminPageContent>
  );
}
