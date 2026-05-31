"use client";

import { Clock, Construction } from "lucide-react";
import { useTranslations } from "next-intl";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  const t = useTranslations("comingSoon");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="size-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
        <Construction className="size-10 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        {title ?? t("title")}
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">
        {description ?? t("description")}
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-4" />
        <span>{t("estimatedTime")}</span>
      </div>
    </div>
  );
}
