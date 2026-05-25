"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CurrentSubscriptionCard } from "./current-subscription-card";
import { SubscriptionQuickActions } from "./subscription-quick-actions";
import { SubscriptionAssignmentForm, type AssignSubscriptionBody } from "./SubscriptionAssignmentForm";
import { SubscriptionHistoryTable } from "./subscription-history-table";

export type { AssignSubscriptionBody };
import type { UserSubscription } from "./ProfileSection";

interface SubscriptionTabProps {
  userId: string;
  subscription: UserSubscription | null;
  isAssigning: boolean;
  assignError: string | null;
  onAssign: (data: AssignSubscriptionBody) => void;
  onRefetch: () => void;
}

export function SubscriptionTab({
  userId,
  subscription,
  isAssigning,
  assignError,
  onAssign,
  onRefetch,
}: SubscriptionTabProps) {
  const t = useTranslations("admin.userDetail.subscription");
  const [isMutating, setIsMutating] = React.useState(false);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);

  function handleMutated() {
    toast.success(t("toasts.updated"));
    onRefetch();
    setHistoryRefresh((n) => n + 1);
  }

  function handleError(msg: string) {
    toast.error(msg);
  }

  return (
    <div className="flex flex-col gap-5">
      <CurrentSubscriptionCard subscription={subscription} />

      <SubscriptionQuickActions
        userId={userId}
        current={subscription}
        onMutated={handleMutated}
        onError={handleError}
        isMutating={isMutating || isAssigning}
        setIsMutating={setIsMutating}
      />

      <SubscriptionAssignmentForm
        userId={userId}
        currentSubscription={subscription}
        onSubmit={onAssign}
        isSubmitting={isAssigning}
        error={assignError}
        onMutated={onRefetch}
      />

      <SubscriptionHistoryTable userId={userId} refreshTrigger={historyRefresh} />
    </div>
  );
}
