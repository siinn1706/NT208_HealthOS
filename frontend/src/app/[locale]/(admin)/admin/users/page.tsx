"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UsersTable, type UserRow } from "@/components/admin/users/UsersTable";
import { ALL_COLUMNS, DEFAULT_VISIBLE } from "@/components/admin/users/users-table-columns";
import { UserStatusFilter, UserStatusValue } from "@/components/admin/users/UserStatusFilter";
import { BanUserModal } from "@/components/admin/users/BanUserModal";
import { AdminErrorState } from "@/components/admin/shared/AdminErrorState";
import { AdminEmptyState } from "@/components/admin/shared/AdminEmptyState";
import { DensityToggle } from "@/components/admin/shared/density-toggle";
import { getDensity, saveDensity, type Density } from "@/lib/admin/ui-prefs";
import { ColumnVisibilityMenu } from "@/components/admin/shared/column-visibility-menu";
import { loadVisibleColumns, saveVisibleColumns } from "@/lib/admin/ui-prefs";
import {
  adminFetch,
  AdminFetchError,
  AdminAuthError,
  AdminForbiddenError,
} from "@/lib/admin/bff-admin-client";
import { AdminPageContent } from "@/components/admin/shared/admin-page-content";
import { AdminPageHeader } from "@/components/admin/shared/admin-page-header";
import { AdminToolbar } from "@/components/admin/shared/admin-toolbar";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const SKELETON_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const MAX_SEARCH_LENGTH = 200;

interface UsersListResponse {
  data: { users: UserRow[]; total: number; page: number; page_size: number };
}

interface SessionResponse {
  data?: { user_id: string | null };
}

type FetchStatus = "idle" | "loading" | "loaded" | "error";

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── URL-synced state ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = React.useState(() => searchParams.get("q") ?? "");
  const [activeSearch, setActiveSearch] = React.useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = React.useState<UserStatusValue>(
    () => (searchParams.get("status") as UserStatusValue) ?? "all",
  );
  const [page, setPage] = React.useState(() => Number(searchParams.get("page") ?? "1") || 1);

  // ── Density + columns (localStorage, hydrated after mount) ────────────────
  const [density, setDensity] = React.useState<Density>("compact");
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(DEFAULT_VISIBLE);
  React.useEffect(() => {
    setDensity(getDensity());
    setVisibleColumns(loadVisibleColumns(DEFAULT_VISIBLE));
  }, []);

  function handleDensityChange(d: Density) {
    setDensity(d);
    saveDensity(d);
  }

  function handleColumnsChange(cols: Set<string>) {
    setVisibleColumns(cols);
    saveVisibleColumns(cols);
  }

  // ── Data state ─────────────────────────────────────────────────────────────
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [fetchStatus, setFetchStatus] = React.useState<FetchStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  // ── Ban modal ──────────────────────────────────────────────────────────────
  const [banTargetId, setBanTargetId] = React.useState<string | null>(null);
  const [isBanModalOpen, setIsBanModalOpen] = React.useState(false);
  const [isBanning, setIsBanning] = React.useState(false);
  const [banError, setBanError] = React.useState<string | null>(null);

  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── URL sync helper ────────────────────────────────────────────────────────
  function pushUrl(q: string, status: UserStatusValue, p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (p > 1) params.set("page", String(p));
    // oxlint-disable-next-line react-doctor/nextjs-no-client-side-redirect -- Mirrors table filters in the URL without a server navigation.
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // ── Session fetch ──────────────────────────────────────────────────────────
  // oxlint-disable-next-line react-doctor/nextjs-no-client-fetch-for-server-data, react-doctor/no-fetch-in-effect -- Session identity is client-only state for admin action guards.
  React.useEffect(() => {
    fetch("/api/v1/auth/session", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: SessionResponse | null) => setSessionUserId(j?.data?.user_id ?? null))
      .catch(() => { /* non-critical */ });
  }, []);

  // ── Core fetch ─────────────────────────────────────────────────────────────
  const fetchUsers = React.useCallback(
    async (search: string, status: UserStatusValue, pageNum: number) => {
      setFetchStatus("loading");
      setErrorMessage(null);

      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      skeletonTimerRef.current = setTimeout(() => {
        setFetchStatus((prev) => {
          if (prev === "loading") { setErrorMessage("Request timed out."); return "error"; }
          return prev;
        });
      }, SKELETON_TIMEOUT_MS);

      try {
        const params = new URLSearchParams({
          search: search.trim().slice(0, MAX_SEARCH_LENGTH),
          status,
          page: String(pageNum),
          page_size: String(PAGE_SIZE),
        });
        const result = await adminFetch<UsersListResponse>(`/api/v1/admin/users?${params}`);
        setUsers(result.data.users);
        setTotal(result.data.total);
        setFetchStatus("loaded");
        setRetryCount(0);
      } catch (err) {
        if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
        setErrorMessage(
          err instanceof AdminFetchError
            ? `Server error (${err.status}). Please try again.`
            : "Failed to load users.",
        );
        setFetchStatus("error");
      } finally {
        if (skeletonTimerRef.current) { clearTimeout(skeletonTimerRef.current); skeletonTimerRef.current = null; }
      }
    },
    [],
  );

  // oxlint-disable-next-line react-doctor/nextjs-no-client-fetch-for-server-data -- Admin table filters are loaded through the existing interactive client grid.
  React.useEffect(() => { void fetchUsers(activeSearch, statusFilter, page); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.slice(0, MAX_SEARCH_LENGTH);
    setSearchInput(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setActiveSearch(value);
      setPage(1);
      pushUrl(value, statusFilter, 1);
      void fetchUsers(value, statusFilter, 1);
    }, DEBOUNCE_MS);
  }

  function handleStatusChange(value: string) {
    const status = value as UserStatusValue;
    setStatusFilter(status);
    setPage(1);
    pushUrl(activeSearch, status, 1);
    void fetchUsers(activeSearch, status, 1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handlePrevPage() {
    if (page <= 1) return;
    const p = page - 1;
    setPage(p);
    pushUrl(activeSearch, statusFilter, p);
    void fetchUsers(activeSearch, statusFilter, p);
  }

  function handleNextPage() {
    if (page >= totalPages) return;
    const p = page + 1;
    setPage(p);
    pushUrl(activeSearch, statusFilter, p);
    void fetchUsers(activeSearch, statusFilter, p);
  }

  function handleRetry() {
    setRetryCount((c) => c + 1);
    void fetchUsers(activeSearch, statusFilter, page);
  }

  function handleClearFilters() {
    setSearchInput(""); setActiveSearch(""); setStatusFilter("all"); setPage(1);
    pushUrl("", "all", 1);
    void fetchUsers("", "all", 1);
  }

  function handleBanClick(userId: string) { setBanTargetId(userId); setBanError(null); setIsBanModalOpen(true); }
  function handleBanModalClose() { if (isBanning) return; setIsBanModalOpen(false); setBanTargetId(null); setBanError(null); }

  async function handleBanSubmit(reason: string) {
    if (!banTargetId) return;
    setIsBanning(true); setBanError(null);
    try {
      await adminFetch(`/api/v1/admin/users/${banTargetId}/ban`, { method: "POST", body: JSON.stringify({ reason }) });
      setUsers((prev) => prev.map((u) => u.user_id === banTargetId ? { ...u, status: "banned" } : u));
      setIsBanModalOpen(false); setBanTargetId(null); setBanError(null);
      toast.success("User banned successfully.");
    } catch (err) {
      if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
      const msg = err instanceof AdminFetchError ? `Ban failed (${err.status}).` : "Ban failed.";
      setBanError(msg); toast.error(msg);
    } finally { setIsBanning(false); }
  }

  async function handleUnban(userId: string) {
    try {
      await adminFetch(`/api/v1/admin/users/${userId}/unban`, { method: "POST" });
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, status: "active" } : u));
      toast.success("User unbanned successfully.");
    } catch (err) {
      if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
      toast.error(err instanceof AdminFetchError ? `Unban failed (${err.status}).` : "Unban failed.");
    }
  }

  React.useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
  }, []);

  const isLoading = fetchStatus === "loading";
  const isError = fetchStatus === "error";
  const isEmpty = fetchStatus === "loaded" && users.length === 0;
  const hasFilters = activeSearch.trim().length > 0 || statusFilter !== "all";

  return (
    <AdminPageContent>
      {/* Page header */}
      <AdminPageHeader title="Users" description="Search, filter, and manage user accounts." />

      {/* Toolbar */}
      <AdminToolbar>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-fg-muted)] pointer-events-none" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search users…"
            value={searchInput}
            onChange={handleSearchChange}
            maxLength={MAX_SEARCH_LENGTH}
            className="pl-9"
            aria-label="Search users"
          />
        </div>

        <UserStatusFilter value={statusFilter} onChange={handleStatusChange} />

        <div className="ml-auto flex items-center gap-2">
          <DensityToggle value={density} onChange={handleDensityChange} />
          <ColumnVisibilityMenu
            columns={ALL_COLUMNS.map((c) => ({ key: c.key, label: c.label || c.key, hideable: ("hideable" in c ? c.hideable : undefined) as boolean | undefined }))}
            visible={visibleColumns}
            onChange={handleColumnsChange}
          />
        </div>
      </AdminToolbar>

      {/* Content */}
      {isError ? (
        <AdminErrorState reason={errorMessage ?? "An unexpected error occurred."} onRetry={handleRetry} retriesLeft={MAX_RETRIES - retryCount} />
      ) : isEmpty ? (
        <AdminEmptyState message={hasFilters ? "No users match your current filters." : "No users found."} hasFilters={hasFilters} onClearFilters={handleClearFilters} />
      ) : (
        <>
          <UsersTable
            users={users}
            sessionUserId={sessionUserId}
            onBan={handleBanClick}
            onUnban={handleUnban}
            isLoading={isLoading}
            density={density}
            visibleColumns={visibleColumns}
          />

          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between text-sm text-[var(--admin-fg-muted)]">
              <span>
                Showing{" "}
                <span className="admin-tabular font-medium text-[var(--admin-fg)]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span>
                {" "}of{" "}
                <span className="admin-tabular font-medium text-[var(--admin-fg)]">{total.toLocaleString()}</span> users
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1} aria-label="Previous page">Previous</Button>
                <span className="px-2 admin-tabular">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= totalPages} aria-label="Next page">Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <BanUserModal key={`${banTargetId ?? "no-user"}:${isBanModalOpen ? "open" : "closed"}`} userId={banTargetId} isOpen={isBanModalOpen} onClose={handleBanModalClose} onSubmit={handleBanSubmit} isSubmitting={isBanning} error={banError} />
    </AdminPageContent>
  );
}
