"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pickLocale } from "@/types";
import type { Plan, Locale } from "@/types";

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("plans");

  const name = pickLocale(plan.name, locale);
  const description = pickLocale(plan.description, locale);
  const features = plan.features.map((f) => pickLocale(f, locale));

  const isFree = plan.price === 0;
  const priceDisplay = isFree
    ? t("free")
    : new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(plan.price) + "₫";

  return (
    <Card
      className={`relative flex flex-col border transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-1 ${
        plan.popular
          ? "border-night-400/60 bg-gradient-to-b from-night-700/5 to-night-400/5 shadow-lg shadow-night-400/10"
          : "border-border/50 bg-card shadow-sm hover:shadow-xl hover:shadow-night-400/10 hover:border-night-400/20"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Badge className="flex items-center gap-1 border-0 bg-gradient-to-r from-night-700 to-night-400 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-night-400/20">
            <Star className="h-3 w-3 fill-current" />
            {t("popular")}
          </Badge>
        </div>
      )}

      <CardContent className="flex flex-1 flex-col p-6 pt-8">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">{name}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold text-foreground">{priceDisplay}</span>
            {!isFree && (
              <span className="mb-1 text-sm text-muted-foreground">{t("month")}</span>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mb-6 flex-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("includes")}
          </p>
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-night-400" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Button
          className={`w-full rounded-full font-semibold transition-[background-color,color,border-color,filter,box-shadow] duration-150 ease-out ${
            plan.popular
              ? "bg-gradient-to-r from-night-700 via-night-600 to-night-400 text-white shadow-md shadow-night-400/20 hover:brightness-110 hover:shadow-night-400/40"
              : "border border-night-600/50 bg-transparent text-night-700 dark:text-night-300 hover:bg-gradient-to-r hover:from-night-700 hover:to-night-400 hover:text-white hover:border-transparent"
          }`}
          variant={plan.popular ? "default" : "outline"}
        >
          {isFree ? t("ctaFree") : t("cta")}
        </Button>
      </CardContent>
    </Card>
  );
}
