"use client";

import * as React from "react";
import { useParams, notFound } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { adminFetch, AdminFetchError, AdminAuthError, AdminForbiddenError } from "@/lib/admin/bff-admin-client";
import type { UserDetail } from "@/components/admin/user-detail/ProfileSection";
import { UserDetailActionBar } from "@/components/admin/user-detail/user-detail-action-bar";
import { UserDetailRail } from "@/components/admin/user-detail/user-detail-rail";
import { UserDetailTabs } from "@/components/admin/user-detail/user-detail-tabs";
import { AdminErrorState } from "@/components/admin/shared/AdminErrorState";
import { BanUserModal } from "@/components/admin/users/BanUserModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssignSubscriptionBody } from "@/components/admin/user-detail/SubscriptionAssignmentForm";

const MAX_RETRIES = 3;
const SUBSCRIPTION_TIMEOUT_MS = 30_000;

interface UserDetailResponse { data: UserDetail; }
interface SessionResponse { data: { user_id: string | null }; }

function isValidUserIdSegment(id: unknown): id is string {
  return typeof id === "string" && id.length >= 1 && id.length <= 64;
}

function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-0" aria-busy="true" aria-label="Loading user details">
      {/* Action bar skeleton */}
      <div className="sticky z-20 flex h-14 items-center gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-6" style={{ top: 0 }}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl" />
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex gap-4 border-b border-[var(--admin-border)] pb-0">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-24" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params?.id;
  const tBan = useTranslations("admin.userDetail.ban");
  const tSub = useTranslations("admin.userDetail.subscription");

  if (!isValidUserIdSegment(id)) notFound();

  const [user, setUser] = React.useState<UserDetail | null>(null);
  const [fetchStatus, setFetchStatus] = React.useState<"loading" | "loaded" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [sessionUserId, setSessionUserId] = React.useState<string | null>(null);

  // Subscription
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [assignError, setAssignError] = React.useState<string | null>(null);

  // Ban modal
  const [isBanModalOpen, setIsBanModalOpen] = React.useState(false);
  const [isBanning, setIsBanning] = React.useState(false);
  const [banError, setBanError] = React.useState<string | null>(null);

  // Unban
  const [isUnbanning, setIsUnbanning] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/v1/auth/session", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: SessionResponse | null) => setSessionUserId(j?.data?.user_id ?? null))
      .catch(() => { /* non-critical */ });
  }, []);

  const fetchUser = React.useCallback(async () => {
    setFetchStatus("loading");
    setErrorMessage(null);
    try {
      const res = await adminFetch<UserDetailResponse>(`/api/v1/admin/users/${id}`);
      setUser(res.data);
      setFetchStatus("loaded");
      setRetryCount(0);
    } catch (err) {
      if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
      setErrorMessage(err instanceof AdminFetchError ? `Server error (${err.status}).` : "Failed to load user.");
      setFetchStatus("error");
    }
  }, [id]);

  React.useEffect(() => { void fetchUser(); }, [fetchUser]);

  function handleRetry() {
    setRetryCount((c) => c + 1);
    void fetchUser();
  }

  const handleAssign = React.useCallback(async (data: AssignSubscriptionBody) => {
    setIsAssigning(true);
    setAssignError(null);
    try {
      await adminFetch(`/api/v1/admin/users/${id}/subscription`, {
        method: "PATCH",
        body: JSON.stringify(data),
        timeoutMs: SUBSCRIPTION_TIMEOUT_MS,
      });
      toast.success(tSub("toasts.updated"));
      void fetchUser();
    } catch (err) {
      if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
      setAssignError(err instanceof AdminFetchError ? `Assignment failed (${err.status}).` : "Assignment failed.");
    } finally {
      setIsAssigning(false);
    }
  }, [id, fetchUser]);

  function handleBanClick() { setBanError(null); setIsBanModalOpen(true); }
  function handleBanModalClose() { if (isBanning) return; setIsBanModalOpen(false); setBanError(null); }

  async function handleBanSubmit(reason: string) {
    setIsBanning(true); setBanError(null);
    try {
      await adminFetch(`/api/v1/admin/users/${id}/ban`, { method: "POST", body: JSON.stringify({ reason }) });
      setUser((u) => u ? { ...u, status: "banned" } : u);
      setIsBanModalOpen(false); setBanError(null);
      toast.success(tBan("toastBanned"));
    } catch (err) {
      if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
      const msg = err instanceof AdminFetchError ? `Ban failed (${err.status}).` : "Ban failed.";
      setBanError(msg); toast.error(msg);
    } finally { setIsBanning(false); }
  }

  async function handleUnban() {
    setIsUnbanning(true);
    try {
      await adminFetch(`/api/v1/admin/users/${id}/unban`, { method: "POST" });
      setUser((u) => u ? { ...u, status: "active" } : u);
      toast.success(tBan("toastUnbanned"));
    } catch (err) {
      if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
      toast.error(err instanceof AdminFetchError ? `Unban failed (${err.status}).` : "Unban failed.");
    } finally { setIsUnbanning(false); }
  }

  if (fetchStatus === "loading" && !user) return <UserDetailSkeleton />;

  if (fetchStatus === "error") {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--admin-fg)]">User Detail</h1>
        <AdminErrorState reason={errorMessage ?? "Unexpected error."} onRetry={handleRetry} retriesLeft={MAX_RETRIES - retryCount} />
      </div>
    );
  }

  if (!user) return null;

  const isSelf = sessionUserId !== null && id === sessionUserId;

  return (
    <div className="flex flex-col">
      <UserDetailActionBar
        userId={id}
        displayName={user.display_name}
        email={user.email}
        status={user.status}
        isSelf={isSelf}
        isBanning={isBanning}
        isUnbanning={isUnbanning}
        onBanClick={handleBanClick}
        onUnban={() => void handleUnban()}
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* Left rail */}
        <div className="lg:col-span-1">
          <UserDetailRail user={user} />
        </div>

        {/* Tabbed content */}
        <div className="lg:col-span-2">
          <UserDetailTabs
            user={user}
            userId={id}
            isAssigning={isAssigning}
            assignError={assignError}
            onAssign={(data) => void handleAssign(data)}
            onRefetch={() => void fetchUser()}
          />
        </div>
      </div>

      <BanUserModal
        userId={id}
        isOpen={isBanModalOpen}
        onClose={handleBanModalClose}
        onSubmit={handleBanSubmit}
        isSubmitting={isBanning}
        error={banError}
      />
    </div>
  );
}
