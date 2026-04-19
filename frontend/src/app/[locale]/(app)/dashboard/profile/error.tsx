"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page";
import { StateView } from "@/components/shared/state";

interface ProfileErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProfileError({ error, reset }: ProfileErrorProps) {
  const t = useTranslations("dashboard.profile");
  const tCommon = useTranslations("common");
  const tState = useTranslations("state.errors");

  useEffect(() => {
    console.error("[ProfilePage] load error:", error);
  }, [error]);

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <StateView
        kind="error"
        title={t("loadError")}
        description={
          error.digest ? (
            <span className="text-xs text-muted-foreground/70">ID: {error.digest}</span>
          ) : (
            tState("description")
          )
        }
        primaryAction={{ label: tCommon("tryAgain"), onClick: reset }}
        density="section"
      />
    </div>
  );
}
