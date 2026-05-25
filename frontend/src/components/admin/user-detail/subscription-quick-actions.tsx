"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { adminFetch, AdminFetchError, AdminAuthError, AdminForbiddenError } from "@/lib/admin/bff-admin-client";
import {
  buildCancelPayload,
  buildExtendPayload,
  buildResetToFreePayload,
  type SubscriptionPatchBody,
} from "@/lib/admin/subscription-quick-action-payloads";
import type { UserSubscription } from "./ProfileSection";

interface SubscriptionQuickActionsProps {
  userId: string;
  current: UserSubscription | null;
  onMutated: () => void;
  onError: (msg: string) => void;
  isMutating: boolean;
  setIsMutating: (v: boolean) => void;
}

interface ActionDef {
  key: "cancel" | "extend30" | "extend90" | "resetFree";
  disabled: boolean;
  buildPayload: () => SubscriptionPatchBody;
  variant?: "destructive" | "outline";
}

export function SubscriptionQuickActions({
  userId,
  current,
  onMutated,
  onError,
  isMutating,
  setIsMutating,
}: SubscriptionQuickActionsProps) {
  const t = useTranslations("admin.userDetail.subscription");
  const tc = useTranslations("admin.common");

  const actions: ActionDef[] = [
    {
      key: "cancel",
      disabled: !current || isMutating,
      buildPayload: () => buildCancelPayload(current!),
      variant: "destructive",
    },
    {
      key: "extend30",
      disabled: isMutating,
      buildPayload: () => buildExtendPayload(current, 30),
    },
    {
      key: "extend90",
      disabled: isMutating,
      buildPayload: () => buildExtendPayload(current, 90),
    },
    {
      key: "resetFree",
      disabled: isMutating,
      buildPayload: buildResetToFreePayload,
      variant: "destructive",
    },
  ];

  async function runAction(buildPayload: () => SubscriptionPatchBody) {
    setIsMutating(true);
    try {
      await adminFetch(`/api/v1/admin/users/${userId}/subscription`, {
        method: "PATCH",
        body: JSON.stringify(buildPayload()),
      });
      onMutated();
    } catch (err) {
      if (err instanceof AdminAuthError || err instanceof AdminForbiddenError) return;
      onError(err instanceof AdminFetchError ? `Update failed (${err.status}).` : "Update failed.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
        {t("quickActions.title")}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <AlertDialog key={action.key}>
            <AlertDialogTrigger asChild>
              <Button
                variant={action.variant ?? "outline"}
                size="sm"
                disabled={action.disabled}
                aria-label={t(`quickActions.${action.key}` as Parameters<typeof t>[0])}
                className="motion-safe:transition-opacity"
              >
                {t(`quickActions.${action.key}` as Parameters<typeof t>[0])}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(`dialogs.${action.key}.title` as Parameters<typeof t>[0])}</AlertDialogTitle>
                <AlertDialogDescription>{t(`dialogs.${action.key}.description` as Parameters<typeof t>[0])}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void runAction(action.buildPayload)}
                  className={action.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                >
                  {t(`dialogs.${action.key}.confirm` as Parameters<typeof t>[0])}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </div>
    </div>
  );
}
