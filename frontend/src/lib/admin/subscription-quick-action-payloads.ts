import type { UserSubscription } from "@/components/admin/user-detail/ProfileSection";

export interface SubscriptionPatchBody {
  plan_code: string;
  status: string;
  expires_at: string | null;
  admin_note?: string;
}

/**
 * Cancel preserves current plan_code and expires_at — only flips status.
 * Service runs to end of paid period (Validation D2).
 */
export function buildCancelPayload(current: UserSubscription): SubscriptionPatchBody {
  return {
    plan_code: current.plan_code,
    status: "canceled",
    expires_at: current.expires_at ?? null,
  };
}

/**
 * Extend by N days. Base = current.expires_at UNLESS sub is null/canceled,
 * in which case base = now. Status forced to "active" (Validation D3).
 */
export function buildExtendPayload(
  current: UserSubscription | null,
  days: number,
): SubscriptionPatchBody {
  const useNow = !current || current.status === "canceled" || !current.expires_at;
  const base = useNow ? new Date() : new Date(current.expires_at!);
  const result = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    plan_code: current?.plan_code ?? "free",
    status: "active",
    expires_at: result.toISOString(),
  };
}

/** Reset to free plan, clear expiry (Validation D3). */
export function buildResetToFreePayload(): SubscriptionPatchBody {
  return { plan_code: "free", status: "active", expires_at: null };
}
