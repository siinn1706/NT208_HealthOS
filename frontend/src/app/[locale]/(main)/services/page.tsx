"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { ContactForm } from "@/components/shared/ContactForm";
import { coreFeatures, aiFeatures, realtimeFeatures, gamificationFeatures } from "@/data/services";
import { LeftDecoration, RightDecoration } from "@/components/shared/Decorations";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  const t = useTranslations("services");
  const [activeTab, setActiveTab] = useState("core");

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-night-900 via-night-800 to-night-900 py-20">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-warm-peach/10 blur-[100px]" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-night-400/15 blur-[80px]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* Text column */}
            <div>
              <Badge className="mb-4 border-0 bg-gradient-to-r from-warm-rose/80 to-warm-peach/80 text-night-900 font-bold shadow-sm shadow-warm-rose/20 hover:brightness-105">
                {t("badge")}
              </Badge>
              <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">{t("title")}</h1>
              <p className="text-lg text-night-100/70">{t("subtitle")}</p>
            </div>
            {/* Robot Doctor — priority since this is the page hero */}
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
      </section>

      {/* ── FEATURE TABS ─────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20">
        <LeftDecoration className="top-10 hidden lg:block" />
        <RightDecoration className="top-10 hidden lg:block" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mx-auto mb-4 flex h-auto w-fit flex-wrap gap-2 bg-background/50">
              <TabsTrigger value="core">{t("tab1Label")}</TabsTrigger>
              <TabsTrigger value="ai">{t("tab2Label")}</TabsTrigger>
              <TabsTrigger value="realtime">{t("tab3Label")}</TabsTrigger>
              <TabsTrigger value="goals">{t("tab4Label")}</TabsTrigger>
            </TabsList>

            {/* Tab descriptions */}
            <div className="mb-10 text-center">
              {activeTab === "core" && (
                <p className="text-sm text-muted-foreground">{t("tab1Desc")}</p>
              )}
              {activeTab === "ai" && (
                <p className="text-sm text-muted-foreground">{t("tab2Desc")}</p>
              )}
              {activeTab === "realtime" && (
                <p className="text-sm text-muted-foreground">{t("tab3Desc")}</p>
              )}
              {activeTab === "goals" && (
                <p className="text-sm text-muted-foreground">{t("tab4Desc")}</p>
              )}
            </div>

            <TabsContent value="core">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {coreFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
              </div>
            </TabsContent>
            <TabsContent value="ai">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {aiFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
              </div>
            </TabsContent>
            <TabsContent value="realtime">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {realtimeFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
              </div>
            </TabsContent>
            <TabsContent value="goals">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {gamificationFeatures.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section className="bg-night-900 py-20 text-white">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-extrabold">{t("pageTitle")}</h2>
            <p className="text-night-100/70">Fill in your information below to receive free consultation.</p>
          </div>
          <ContactForm />
        </div>
      </section>

    </div>
  );
}
