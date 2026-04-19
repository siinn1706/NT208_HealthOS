"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { ContactForm } from "@/components/shared/ContactForm";
import { coreFeatures, aiFeatures, realtimeFeatures, gamificationFeatures } from "@/data/services";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { Section } from "@/components/shared/Section";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";
import { AtmosphereGlow } from "@/components/shared/AtmosphereGlow";
import { Link } from "@/navigation";
import { Database, Sparkles, Activity, Trophy } from "lucide-react";

const TAB_KEYS = ["core", "ai", "realtime", "goals"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_META: Record<TabKey, { labelKey: string; promiseKey: string; descKey: string; icon: React.ElementType; relatedPlanId: string }> = {
  core: { labelKey: "tab1Label", promiseKey: "tab1Promise", descKey: "tab1Desc", icon: Database, relatedPlanId: "plan-free" },
  ai: { labelKey: "tab2Label", promiseKey: "tab2Promise", descKey: "tab2Desc", icon: Sparkles, relatedPlanId: "plan-basic" },
  realtime: { labelKey: "tab3Label", promiseKey: "tab3Promise", descKey: "tab3Desc", icon: Activity, relatedPlanId: "plan-family" },
  goals: { labelKey: "tab4Label", promiseKey: "tab4Promise", descKey: "tab4Desc", icon: Trophy, relatedPlanId: "plan-pro" },
};

const TAB_DATA: Record<TabKey, typeof coreFeatures> = {
  core: coreFeatures,
  ai: aiFeatures,
  realtime: realtimeFeatures,
  goals: gamificationFeatures,
};

export default function ServicesPage() {
  const t = useTranslations("services");
  const [activeTab, setActiveTab] = useState<TabKey>("core");

  return (
    <div className="pt-16 md:pt-20">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <Section
        tone="dark"
        padding="lg"
        contained={false}
        aria-labelledby="services-hero-title"
      >
        <AtmosphereGrid />
        <AtmosphereGlow variant="soft" />
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-warm-peach/10 blur-[100px]" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-night-400/15 blur-[80px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge className="mb-4 border-0 bg-gradient-to-r from-warm-rose/80 to-warm-peach/80 text-night-900 font-bold shadow-sm shadow-warm-rose/20 hover:brightness-105">
                {t("badge")}
              </Badge>
              <h1
                id="services-hero-title"
                className="mb-4 text-4xl font-extrabold text-white sm:text-5xl"
              >
                {t("title")}
              </h1>
              <p className="text-lg text-night-100/80">{t("subtitle")}</p>
            </div>
            <div className="flex items-center justify-center">
              <AnimatedIllustration
                src="/illustrations/robot_doctor.svg"
                alt=""
                width={340}
                height={340}
                priority
                floatVariant="normal"
                className="drop-shadow-[0_20px_60px_rgba(65,188,230,0.2)]"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── SERVICES AT A GLANCE ────────────────────────────── */}
      <Section
        tone="muted"
        padding="md"
        overflow="visible"
        aria-labelledby="services-overview-title"
      >
        <SectionHeader
          id="services-overview-title"
          eyebrow={t("overviewBadge")}
          title={t("overviewTitle")}
          subtitle={t("overviewSubtitle")}
          align="center"
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TAB_KEYS.map((key) => {
            const meta = TAB_META[key];
            const Icon = meta.icon;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(key);
                    document
                      .getElementById("services-tabs")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="group flex h-full w-full flex-col rounded-2xl border border-border/60 bg-card p-5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-night-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2"
                >
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mb-1 text-base font-semibold text-foreground">
                    {t(meta.labelKey)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(meta.promiseKey)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── FEATURE TABS ─────────────────────────────────────── */}
      <Section
        id="services-tabs"
        tone="default"
        padding="md"
        aria-labelledby="services-tabs-title"
      >
        <h2 id="services-tabs-title" className="sr-only">
          {t("title")}
        </h2>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
          className="w-full"
        >
          <TabsList className="mx-auto mb-4 flex h-auto w-fit flex-wrap gap-2 bg-background/50">
            {TAB_KEYS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {t(TAB_META[key].labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab promise + related plan */}
          <div className="mb-10 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              {t(TAB_META[activeTab].descKey)}
            </p>
            <Link
              href={`/plans#${TAB_META[activeTab].relatedPlanId}`}
              className="text-sm font-semibold text-night-700 underline-offset-4 hover:underline dark:text-night-300"
            >
              {t("seeRelatedPlan")}
            </Link>
          </div>

          {TAB_KEYS.map((key) => (
            <TabsContent key={key} value={key}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {TAB_DATA[key].map((svc) => (
                  <ServiceCard key={svc.id} service={svc} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <Section tone="dark" padding="md" contained={false}>
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-extrabold text-white">
              {t("contactTitle")}
            </h2>
            <p className="text-night-100/80">{t("contactSubtitle")}</p>
          </div>
          <ContactForm />
        </div>
      </Section>
    </div>
  );
}
