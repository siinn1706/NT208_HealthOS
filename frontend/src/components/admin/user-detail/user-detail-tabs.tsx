"use client";

import * as React from "react";
import { User, CreditCard, Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileSection, type UserDetail } from "./ProfileSection";
import { SubscriptionTab, type AssignSubscriptionBody } from "./subscription-tab";
import { UserAuditTab } from "./user-audit-tab";

type TabId = "profile" | "subscription" | "activity";

const VALID_TABS: TabId[] = ["profile", "subscription", "activity"];

const TAB_META: Record<TabId, { labelKey: string; Icon: React.ElementType }> = {
  profile:      { labelKey: "tabs.profile",      Icon: User },
  subscription: { labelKey: "tabs.subscription", Icon: CreditCard },
  activity:     { labelKey: "tabs.activity",     Icon: Activity },
};

function readHashTab(): TabId {
  if (typeof window === "undefined") return "profile";
  const hash = window.location.hash.replace("#", "") as TabId;
  return VALID_TABS.includes(hash) ? hash : "profile";
}

interface UserDetailTabsProps {
  user: UserDetail;
  userId: string;
  isAssigning: boolean;
  assignError: string | null;
  onAssign: (data: AssignSubscriptionBody) => void;
  onRefetch?: () => void;
}

export function UserDetailTabs({
  user,
  userId,
  isAssigning,
  assignError,
  onAssign,
  onRefetch,
}: UserDetailTabsProps) {
  const t = useTranslations("admin.userDetail");
  const [activeTab, setActiveTab] = React.useState<TabId>("profile");

  React.useEffect(() => {
    setActiveTab(readHashTab());
    function onHashChange() { setActiveTab(readHashTab()); }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleTabChange(value: string) {
    const tab = value as TabId;
    setActiveTab(tab);
    window.location.hash = tab === "profile" ? "" : tab;
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-0">
      <TabsList className="w-full justify-start rounded-none border-b border-[var(--admin-border)] bg-transparent p-0">
        {VALID_TABS.map((tabId) => {
          const { labelKey, Icon } = TAB_META[tabId];
          return (
            <TabsTrigger
              key={tabId}
              value={tabId}
              className="relative flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)] focus-visible:ring-offset-1 focus-visible:outline-none data-[state=active]:border-[var(--admin-brand)] data-[state=active]:font-semibold data-[state=active]:text-[var(--admin-brand)] data-[state=inactive]:text-[var(--admin-fg-muted)] motion-safe:transition-colors"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {t(labelKey as Parameters<typeof t>[0])}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* min-height prevents layout shift on tab switch */}
      <div className="min-h-64">
        <TabsContent value="profile" className="mt-5 focus-visible:outline-none">
          <ProfileSection user={user} />
        </TabsContent>

        <TabsContent value="subscription" className="mt-5 focus-visible:outline-none">
          <SubscriptionTab
            userId={userId}
            subscription={user.subscription}
            isAssigning={isAssigning}
            assignError={assignError}
            onAssign={onAssign}
            onRefetch={onRefetch ?? (() => {})}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-5 focus-visible:outline-none">
          <UserAuditTab userId={userId} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
