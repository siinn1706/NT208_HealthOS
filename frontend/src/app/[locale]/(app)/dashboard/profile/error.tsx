"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProfileError({ error, reset }: ProfileErrorProps) {
  const t = useTranslations("dashboard.profile");
  const tCommon = useTranslations("common");

  useEffect(() => {
    console.error("[ProfilePage] load error:", error);
  }, [error]);

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Error card */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
        <AlertTriangle className="mx-auto mb-3 size-8 text-destructive/70" />
        <p className="text-sm font-medium text-foreground">{t("loadError")}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="mt-4 gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          {tCommon("tryAgain")}
        </Button>
      </div>
    </div>
  );
}
