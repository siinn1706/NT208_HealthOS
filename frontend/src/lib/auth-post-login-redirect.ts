import { getSafePostLoginRedirectPath } from "@/lib/safe-post-login-redirect";

interface ResolvePostLoginRedirectInput {
  isAdmin: boolean;
  onboardingStatus: unknown;
  fromRaw: string | null;
}

export function resolvePostLoginRedirectPath({
  isAdmin,
  onboardingStatus,
  fromRaw,
}: ResolvePostLoginRedirectInput): string {
  if (isAdmin) {
    return "/admin";
  }

  if (onboardingStatus === "completed") {
    return getSafePostLoginRedirectPath(fromRaw) ?? "/dashboard";
  }

  return "/onboarding";
}
