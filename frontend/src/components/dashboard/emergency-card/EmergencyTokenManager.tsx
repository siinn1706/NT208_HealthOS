/**
 * EmergencyTokenManager — list of QR tokens + mint/revoke controls.
 *
 * The "Mint" CTA opens `EmergencyMintDialog`. After a successful mint the
 * dialog hands back the plaintext + QR data URL exactly once; we then
 * pop the `EmergencyMintResultDialog` so the owner can save / print / copy
 * before navigating away.
 */
"use client";

import {
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  ShieldOff,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-utils";
import type {
  EmergencyShareToken,
  EmergencyShareTokenWithSecret,
} from "@/lib/emergency-card-types";

import { EmergencyMintDialog } from "./EmergencyMintDialog";
import { EmergencyMintResultDialog } from "./EmergencyMintResultDialog";

interface EmergencyTokenManagerProps {
  tokens: EmergencyShareToken[];
  activeCount: number;
  maxActive: number;
  isPublished: boolean;
  completenessScore: number;
  missingCriticalFields: string[];
  /** U4 — passed through to the mint dialog so the consent preview
   * can show the actual values that will be exposed (instead of a
   * generic bullet list).
   */
  cardPreview?: React.ComponentProps<typeof EmergencyMintDialog>["cardPreview"];
}

export function EmergencyTokenManager({
  tokens,
  activeCount,
  maxActive,
  isPublished,
  completenessScore,
  missingCriticalFields,
  cardPreview,
}: EmergencyTokenManagerProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.emergencyCard.tokens");
  const locale = useLocale();
  const [mintOpen, setMintOpen] = React.useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [revokingAll, setRevokingAll] = React.useState(false);
  const [lastMint, setLastMint] = React.useState<EmergencyShareTokenWithSecret | null>(null);

  const reachedCap = activeCount >= maxActive;

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId);
    try {
      const res = await fetch(
        `/api/v1/users/me/emergency-profile/tokens/${encodeURIComponent(tokenId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("revoke-failed");
      toast.success(t("revokedToast"));
      router.refresh();
    } catch {
      toast.error(t("revokeFailed"));
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    try {
      const res = await fetch(
        "/api/v1/users/me/emergency-profile/tokens/revoke-all",
        { method: "POST" }
      );
      if (!res.ok) throw new Error("revoke-all-failed");
      toast.success(t("revokedAllToast"));
      setRevokeAllOpen(false);
      router.refresh();
    } catch {
      toast.error(t("revokeAllFailed"));
    } finally {
      setRevokingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("activeCount", { active: activeCount, max: maxActive })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* M8 — only show "Revoke all" when there's more than one active */}
          {/* token; with a single token the per-row Revoke is unambiguous. */}
          {activeCount > 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRevokeAllOpen(true)}
              className="gap-1.5"
            >
              <ShieldOff className="size-3.5" aria-hidden />
              {t("revokeAll")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => setMintOpen(true)}
            disabled={!isPublished || reachedCap}
            className="gap-1.5"
            title={
              !isPublished
                ? t("mintDisabledNotPublished")
                : reachedCap
                  ? t("mintDisabledCap")
                  : undefined
            }
          >
            <Plus className="size-3.5" aria-hidden />
            {t("mint")}
          </Button>
        </div>
      </div>

      {/* Token list */}
      {tokens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <p>{t("emptyTitle")}</p>
          <p className="mt-0.5 text-xs">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tokens.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              locale={locale}
              t={t}
              onRevoke={handleRevoke}
              revoking={revokingId === token.id}
            />
          ))}
        </ul>
      )}

      <EmergencyMintDialog
        open={mintOpen}
        onOpenChange={setMintOpen}
        completenessScore={completenessScore}
        missingCriticalFields={missingCriticalFields}
        cardPreview={cardPreview}
        onMinted={(payload) => {
          setLastMint(payload);
          setMintOpen(false);
          router.refresh();
        }}
      />

      <EmergencyMintResultDialog
        result={lastMint}
        onClose={() => setLastMint(null)}
      />

      <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeAllConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revokeAllConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingAll}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  void handleRevokeAll();
                }}
                disabled={revokingAll}
                className="gap-2"
              >
                {revokingAll ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <ShieldOff className="size-3.5" aria-hidden />
                )}
                {t("revokeAllConfirmCta")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TokenRow({
  token,
  locale,
  t,
  onRevoke,
  revoking,
}: {
  token: EmergencyShareToken;
  locale: string;
  t: ReturnType<typeof useTranslations<"dashboard.emergencyCard.tokens">>;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const created = formatDate(token.created_at, locale);
  const lastSeen = token.last_accessed_at
    ? formatDate(token.last_accessed_at, locale)
    : null;
  const tokenIdShort = token.id.slice(0, 8);

  return (
    <li
      className={cn(
        "rounded-lg border bg-card p-3.5",
        token.is_active ? "border-border" : "border-border/60 bg-muted/30 opacity-80"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {token.is_active ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                title={t("active")}
              >
                <Eye className="size-2.5" aria-hidden /> {t("active")}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                title={t("revoked")}
              >
                <EyeOff className="size-2.5" aria-hidden /> {t("revoked")}
              </span>
            )}
            <p className="truncate text-sm font-medium text-foreground">
              {token.label}
            </p>
            <span className="font-mono text-[10px] text-muted-foreground">
              #{tokenIdShort}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {t("createdAt", { date: created })}
            </span>
            {lastSeen ? (
              <span>{t("lastSeen", { date: lastSeen })}</span>
            ) : (
              <span>{t("neverScanned")}</span>
            )}
            <span>{t("hits", { count: token.access_count })}</span>
          </div>
        </div>
        {token.is_active && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRevoke(token.id)}
            disabled={revoking}
            aria-label={`Revoke ${token.label}`}
          >
            {revoking ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            {t("revoke")}
          </Button>
        )}
      </div>
    </li>
  );
}

