// oxlint-disable react-doctor/nextjs-missing-metadata -- Services metadata is supplied by the route layout.
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { ContactForm } from "@/components/shared/ContactForm";
import { Section } from "@/components/shared/Section";
import { MarketingServicesTabsIsland } from "@/components/shared/marketing-services-tabs-island";
import { coreFeatures, aiFeatures, realtimeFeatures, gamificationFeatures } from "@/data/services";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";

export default async function ServicesPage() {
  const t = await getTranslations("services");

  const tabs = [
    {
      id: "core" as const,
      labelKey: t("tab1Label"),
      descKey: t("tab1Desc"),
      promiseText: t("tab1Promise"),
      relatedLabel: t("seeRelatedPlan"),
      services: coreFeatures,
    },
    {
      id: "ai" as const,
      labelKey: t("tab2Label"),
      descKey: t("tab2Desc"),
      promiseText: t("tab2Promise"),
      relatedLabel: t("seeRelatedPlan"),
      services: aiFeatures,
    },
    {
      id: "realtime" as const,
      labelKey: t("tab3Label"),
      descKey: t("tab3Desc"),
      promiseText: t("tab3Promise"),
      relatedLabel: t("seeRelatedPlan"),
      services: realtimeFeatures,
    },
    {
      id: "goals" as const,
      labelKey: t("tab4Label"),
      descKey: t("tab4Desc"),
      promiseText: t("tab4Promise"),
      relatedLabel: t("seeRelatedPlan"),
      services: gamificationFeatures,
    },
  ];

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <Section tone="dark" padding="lg" contained={false} aria-labelledby="services-hero-title">
        <AtmosphereGrid variant="dots" tone="dark" interactive />
        <div className="absolute -top-20 -right-20 size-72 rounded-full bg-warm-peach/10 blur-[100px]" />
        <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-night-400/15 blur-[80px]" />
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

      {/* ── OVERVIEW TILES + FEATURE TABS (client island) ────── */}
      <MarketingServicesTabsIsland
        tabs={tabs}
        overviewBadge={t("overviewBadge")}
        overviewTitle={t("overviewTitle")}
        overviewSubtitle={t("overviewSubtitle")}
        seeRelatedPlan={t("seeRelatedPlan")}
        mainTitle={t("title")}
      />

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
