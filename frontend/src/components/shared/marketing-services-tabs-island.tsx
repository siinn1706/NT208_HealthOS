"use client";

import { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { Section } from "@/components/shared/Section";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ArrowRight, Stethoscope, Sparkles, Activity, Trophy } from "lucide-react";
import type { Service } from "@/types";

const TAB_IDS = ["core", "ai", "realtime", "goals"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_ICONS: Record<TabId, typeof Stethoscope> = {
  core: Stethoscope,
  ai: Sparkles,
  realtime: Activity,
  goals: Trophy,
};

const RELATED_PLAN_CATEGORY: Record<TabId, string> = {
  core: "personal",
  ai: "personal",
  realtime: "family",
  goals: "free",
};

export interface ServicesTab {
  id: TabId;
  labelKey: string;
  descKey: string;
  promiseText: string;
  relatedLabel: string;
  services: Service[];
}

interface Props {
  tabs: ServicesTab[];
  overviewBadge: string;
  overviewTitle: string;
  overviewSubtitle: string;
  seeRelatedPlan: string;
  mainTitle: string;
}

export function MarketingServicesTabsIsland({
  tabs,
  overviewBadge,
  overviewTitle,
  overviewSubtitle,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("core");

  // Hash-based deep linking
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
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <>
      {/* ── OVERVIEW TILES ─────────────────────────────────── */}
      <Section tone="muted" padding="md" overflow="visible" aria-labelledby="services-overview-title">
        <SectionHeader
          id="services-overview-title"
          eyebrow={overviewBadge}
          title={overviewTitle}
          subtitle={overviewSubtitle}
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className="group flex size-full flex-col rounded-2xl border border-border/60 bg-card p-5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-night-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2"
                  aria-controls={`services-tab-${tab.id}`}
                >
                  <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mb-1 text-base font-semibold text-foreground">{tab.labelKey}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tab.descKey}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── FEATURE TABS ─────────────────────────────────────── */}
      <Section padding="md" overflow="visible" aria-labelledby="services-tabs-title">
        <h2 id="services-tabs-title" className="sr-only">Services</h2>
        <Tabs value={activeTab} onValueChange={(v) => selectTab(v as TabId)} className="w-full">
          <TabsList className="mx-auto mb-4 flex h-auto w-fit flex-wrap gap-2 bg-background/50">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.labelKey}</TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} id={`services-tab-${tab.id}`}>
              <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground">
                {tab.promiseText}
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tab.services.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
              </div>
              <div className="mt-8 text-center">
                <Link
                  href={`/plans?category=${RELATED_PLAN_CATEGORY[tab.id]}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-night-700 hover:text-night-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2 dark:text-night-300 dark:hover:text-night-200"
                  data-event="services-see-related-plan"
                  data-event-tab={tab.id}
                >
                  {tab.relatedLabel}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Section>
    </>
  );
}
