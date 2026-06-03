// oxlint-disable react-doctor/nextjs-missing-metadata -- Plans metadata is supplied by the route layout.
import { getTranslations, getLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { TestimonialCard } from "@/components/shared/TestimonialCard";
import { Section } from "@/components/shared/Section";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CompareTable, type CompareColumn, type CompareRow } from "@/components/shared/CompareTable";
import { ComplianceStrip } from "@/components/shared/ComplianceStrip";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";
import { AtmosphereGlow } from "@/components/shared/AtmosphereGlow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingPlansFilterIsland } from "@/components/shared/marketing-plans-filter-island";
import { plans, planCategories } from "@/data/plans";
import { faqs } from "@/data/faqs";
import { testimonials } from "@/data/testimonials";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";
import { Repeat, ShieldCheck, Lock } from "lucide-react";

const COMPARE_COLUMN_PLAN_IDS = ["plan-free", "plan-basic", "plan-family", "plan-pro"];
const COMPARE_PRICE_FORMATTERS = {
  en: new Intl.NumberFormat("en-US"),
  vi: new Intl.NumberFormat("vi-VN"),
} as const;
const COMPARE_ROW_KEYS = ["records", "aiMeal", "wearables", "family", "doctor", "support"] as const;
type RowKey = (typeof COMPARE_ROW_KEYS)[number];

const COMPARE_VALUES: Record<RowKey, Record<string, boolean | string>> = {
  records: { "plan-free": true, "plan-basic": true, "plan-family": true, "plan-pro": true },
  aiMeal: { "plan-free": false, "plan-basic": true, "plan-family": true, "plan-pro": true },
  wearables: { "plan-free": false, "plan-basic": true, "plan-family": true, "plan-pro": true },
  family: { "plan-free": false, "plan-basic": false, "plan-family": true, "plan-pro": true },
  doctor: { "plan-free": false, "plan-basic": false, "plan-family": false, "plan-pro": true },
  support: { "plan-free": false, "plan-basic": false, "plan-family": false, "plan-pro": true },
};

const HOW_BULLETS = [
  { icon: Repeat, titleKey: "howItWorksBullet1Title", descKey: "howItWorksBullet1Desc" },
  { icon: ShieldCheck, titleKey: "howItWorksBullet2Title", descKey: "howItWorksBullet2Desc" },
  { icon: Lock, titleKey: "howItWorksBullet3Title", descKey: "howItWorksBullet3Desc" },
] as const;

export default async function PlansPage() {
  const t = await getTranslations("plans");
  const locale = (await getLocale()) as Locale;

  const compareColumns: CompareColumn[] = COMPARE_COLUMN_PLAN_IDS.flatMap((id) => {
    const p = plans.find((x) => x.id === id);
    if (!p) return [];
    const isFree = p.price === 0;
    return [
      {
        id,
        label: pickLocale(p.name, locale),
        caption: isFree
          ? t("free")
          : COMPARE_PRICE_FORMATTERS[locale === "vi" ? "vi" : "en"].format(p.price) + "₫" + t("month"),
        recommended: p.recommended === true,
      },
    ];
  });

  const compareRows: CompareRow[] = COMPARE_ROW_KEYS.map((key) => ({
    id: key,
    label: t(`compareRows.${key}`),
    values: COMPARE_VALUES[key],
  }));

  const planFaqs = faqs.filter((f) => f.categoryId === "plans" || f.categoryId === "privacy");

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <Section tone="dark" padding="lg" contained={false} aria-labelledby="plans-hero-title">
        <AtmosphereGrid variant="dots" tone="dark" interactive />
        <AtmosphereGlow />
        <div className="absolute -top-20 -right-20 size-72 rounded-full bg-night-400/15 blur-[100px]" />
        <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-warm-gold/10 blur-[80px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge className="mb-4 border-0 bg-gradient-to-r from-night-700/80 to-night-400/80 text-white font-bold shadow-sm hover:brightness-110">
                {t("badge")}
              </Badge>
              <h1 id="plans-hero-title" className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
                {t("title")}
              </h1>
              <p className="text-lg text-night-100/80">{t("subtitle")}</p>
            </div>
            <div className="flex items-center justify-center">
              <AnimatedIllustration
                src="/illustrations/robot_checklist_write.svg"
                alt=""
                width={340}
                height={340}
                priority
                floatVariant="delayed"
                className="drop-shadow-[0_20px_60px_rgba(231,222,167,0.15)]"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── HOW PLANS WORK ──────────────────────────────────── */}
      <Section tone="muted" padding="md" overflow="visible" aria-labelledby="plans-how-title">
        <SectionHeader
          id="plans-how-title"
          eyebrow={t("badge")}
          title={t("howItWorksTitle")}
          subtitle={t("howItWorksSubtitle")}
          align="center"
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HOW_BULLETS.map((b) => {
            const Icon = b.icon;
            return (
              <li key={b.titleKey} className="flex flex-col rounded-2xl border border-border/60 bg-card p-5">
                <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mb-1 text-base font-semibold text-foreground">{t(b.titleKey)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(b.descKey)}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── PLAN FILTER + GRID (client island) ──────────────── */}
      <MarketingPlansFilterIsland
        plans={plans}
        planCategories={planCategories}
        locale={locale}
        title={t("title")}
      />

      {/* ── COMPARE TABLE ───────────────────────────────────── */}
      <Section tone="muted" padding="md" overflow="visible" aria-labelledby="plans-compare-title">
        <SectionHeader
          id="plans-compare-title"
          eyebrow={t("badge")}
          title={t("compareTitle")}
          subtitle={t("compareSubtitle")}
          align="center"
        />
        <CompareTable
          caption={t("compareTitle")}
          featureColumnLabel={t("compareFeature")}
          includedLabel={t("compareIncluded")}
          notIncludedLabel={t("compareNotIncluded")}
          columns={compareColumns}
          rows={compareRows}
        />
      </Section>

      {/* ── TESTIMONIAL STRIP ───────────────────────────────── */}
      <Section tone="default" padding="md" overflow="visible" aria-labelledby="plans-testimonials-title">
        <SectionHeader
          id="plans-testimonials-title"
          eyebrow={t("badge")}
          title={t("testimonialsTitle")}
          subtitle={t("testimonialsSubtitle")}
          align="center"
        />
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.slice(0, 3).map((tt) => (
            <li key={tt.id} className="flex">
              <TestimonialCard testimonial={tt} />
            </li>
          ))}
        </ul>
      </Section>

      {/* ── PLAN-SCOPED FAQ ─────────────────────────────────── */}
      {planFaqs.length > 0 && (
        <Section id="faq" tone="muted" padding="md" overflow="visible" aria-labelledby="plans-faq-title">
          <div className="mx-auto max-w-3xl">
            <SectionHeader
              id="plans-faq-title"
              eyebrow={t("badge")}
              title={t("faqTitle")}
              subtitle={t("faqSubtitle")}
              align="center"
            />
            <Accordion type="single" collapsible className="w-full">
              {planFaqs.map((faq, i) => (
                <AccordionItem key={faq.id} value={`plans-faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-semibold">
                    {pickLocale(faq.question, locale)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {pickLocale(faq.answer, locale)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Section>
      )}

      {/* ── COMPLIANCE ──────────────────────────────────────── */}
      <Section tone="default" padding="sm">
        <div className="mx-auto max-w-3xl">
          <ComplianceStrip />
        </div>
      </Section>

    </div>
  );
}
