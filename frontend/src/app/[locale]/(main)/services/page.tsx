"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { ContactForm } from "@/components/shared/ContactForm";
import { Section } from "@/components/shared/Section";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { coreFeatures, aiFeatures, realtimeFeatures, gamificationFeatures } from "@/data/services";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { ArrowRight, Stethoscope, Sparkles, Activity, Trophy } from "lucide-react";

const TAB_IDS = ["core", "ai", "realtime", "goals"] as const;
type TabId = (typeof TAB_IDS)[number];

const RELATED_PLAN_CATEGORY: Record<TabId, string> = {
  core: "personal",
  ai: "personal",
  realtime: "family",
  goals: "free",
};

const OVERVIEW_TILES: { id: TabId; icon: typeof Stethoscope; labelKey: string; descKey: string }[] = [
  { id: "core", icon: Stethoscope, labelKey: "tab1Label", descKey: "tab1Desc" },
  { id: "ai", icon: Sparkles, labelKey: "tab2Label", descKey: "tab2Desc" },
  { id: "realtime", icon: Activity, labelKey: "tab3Label", descKey: "tab3Desc" },
  { id: "goals", icon: Trophy, labelKey: "tab4Label", descKey: "tab4Desc" },
];

export default function ServicesPage() {
  const t = useTranslations("services");
  const [activeTab, setActiveTab] = useState<TabId>("core");

  // Hash-based deep linking: read on mount + on hashchange
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace("#", "");
      if ((TAB_IDS as readonly string[]).includes(h)) {
        setActiveTab(h as TabId);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function selectTab(id: TabId) {
    setActiveTab(id);
    if (typeof window !== "undefined") {
      // Update hash without triggering scroll-jank
      history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <Section tone="dark" padding="lg" contained={false} aria-labelledby="services-hero-title">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-warm-peach/10 blur-[100px]" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-night-400/15 blur-[80px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge className="mb-4 border-0 bg-gradient-to-r from-warm-rose/80 to-warm-peach/80 text-night-900 font-bold shadow-sm shadow-warm-rose/20 hover:brightness-105">
                {t("badge")}
              </Badge>
              <h1 id="services-hero-title" className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
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

      {/* ── OVERVIEW (Services at a glance) ──────────────────── */}
      <Section tone="muted" padding="md" overflow="visible" aria-labelledby="services-overview-title">
        <SectionHeader
          id="services-overview-title"
          eyebrow={t("overviewBadge")}
          title={t("overviewTitle")}
          subtitle={t("overviewSubtitle")}
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OVERVIEW_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <li key={tile.id}>
                <button
                  type="button"
                  onClick={() => selectTab(tile.id)}
                  className="group flex h-full w-full flex-col rounded-2xl border border-border/60 bg-card p-5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-night-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2"
                  aria-controls={`services-tab-${tile.id}`}
                >
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mb-1 text-base font-semibold text-foreground">{t(tile.labelKey)}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t(tile.descKey)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── FEATURE TABS ─────────────────────────────────────── */}
      <Section padding="md" overflow="visible" aria-labelledby="services-tabs-title">
        <h2 id="services-tabs-title" className="sr-only">{t("title")}</h2>
        <Tabs value={activeTab} onValueChange={(v) => selectTab(v as TabId)} className="w-full">
          <TabsList className="mx-auto mb-4 flex h-auto w-fit flex-wrap gap-2 bg-background/50">
            <TabsTrigger value="core">{t("tab1Label")}</TabsTrigger>
            <TabsTrigger value="ai">{t("tab2Label")}</TabsTrigger>
            <TabsTrigger value="realtime">{t("tab3Label")}</TabsTrigger>
            <TabsTrigger value="goals">{t("tab4Label")}</TabsTrigger>
          </TabsList>

          <TabContent
            id="core"
            promise={t("tab1Promise")}
            relatedHref={`/plans?category=${RELATED_PLAN_CATEGORY.core}`}
            relatedLabel={t("seeRelatedPlan")}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coreFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
            </div>
          </TabContent>
          <TabContent
            id="ai"
            promise={t("tab2Promise")}
            relatedHref={`/plans?category=${RELATED_PLAN_CATEGORY.ai}`}
            relatedLabel={t("seeRelatedPlan")}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {aiFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
            </div>
          </TabContent>
          <TabContent
            id="realtime"
            promise={t("tab3Promise")}
            relatedHref={`/plans?category=${RELATED_PLAN_CATEGORY.realtime}`}
            relatedLabel={t("seeRelatedPlan")}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {realtimeFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
            </div>
          </TabContent>
          <TabContent
            id="goals"
            promise={t("tab4Promise")}
            relatedHref={`/plans?category=${RELATED_PLAN_CATEGORY.goals}`}
            relatedLabel={t("seeRelatedPlan")}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gamificationFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
            </div>
          </TabContent>
        </Tabs>
      </Section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <Section tone="dark" padding="lg" contained={false} aria-labelledby="services-contact-title">
        <div className="relative mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 id="services-contact-title" className="mb-3 text-3xl font-extrabold">{t("contactTitle")}</h2>
            <p className="text-night-100/80">{t("contactSubtitle")}</p>
          </div>
          <ContactForm />
        </div>
      </Section>

    </div>
  );
}

interface TabContentProps {
  id: TabId;
  promise: string;
  relatedHref: string;
  relatedLabel: string;
  children: React.ReactNode;
}

function TabContent({ id, promise, relatedHref, relatedLabel, children }: TabContentProps) {
  return (
    <TabsContent value={id} id={`services-tab-${id}`}>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground">
        {promise}
      </p>
      {children}
      <div className="mt-8 text-center">
        <Link
          href={relatedHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-night-700 hover:text-night-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2 dark:text-night-300 dark:hover:text-night-200"
          data-event="services-see-related-plan"
          data-event-tab={id}
        >
          {relatedLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </TabsContent>
  );
}
