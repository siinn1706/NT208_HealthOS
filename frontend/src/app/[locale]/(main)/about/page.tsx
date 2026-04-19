"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TeamMemberCard } from "@/components/shared/TeamMemberCard";
import { ContactForm } from "@/components/shared/ContactForm";
import { Section } from "@/components/shared/Section";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TrustStrip, type TrustItem } from "@/components/shared/TrustStrip";
import { ComplianceStrip } from "@/components/shared/ComplianceStrip";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";
import { AtmosphereGlow } from "@/components/shared/AtmosphereGlow";
import { teamMembers } from "@/data/team";
import { faqs, faqCategories } from "@/data/faqs";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";
import { Users, Stethoscope, ShieldCheck, Activity } from "lucide-react";

export default function AboutPage() {
  const t = useTranslations("about");
  const locale = useLocale() as Locale;
  const [activeCategory, setActiveCategory] = useState("general");

  const filteredFaqs = useMemo(
    () => faqs.filter((f) => f.categoryId === activeCategory),
    [activeCategory]
  );

  const coreMembers = teamMembers.filter((m) => m.group !== "advisor");
  const advisorMembers = teamMembers.filter((m) => m.group === "advisor");

  const trustItems: TrustItem[] = [
    { id: "users", value: "10k+", label: t("atGlance.users"), icon: Users },
    { id: "doctors", value: "120+", label: t("atGlance.doctors"), icon: Stethoscope },
    { id: "records", value: "AES-256", label: t("atGlance.records"), icon: ShieldCheck },
    { id: "uptime", value: "99.9%", label: t("atGlance.uptime"), icon: Activity },
  ];

  return (
    <div className="pt-16 md:pt-20">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <Section
        tone="dark"
        padding="lg"
        contained={false}
        aria-labelledby="about-hero-title"
      >
        <AtmosphereGrid />
        <AtmosphereGlow variant="soft" />
        <div className="absolute -right-32 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h1
                id="about-hero-title"
                className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl"
              >
                {t("hero.title")}
              </h1>
              <p className="text-lg leading-relaxed text-night-100/70">
                {t("hero.description")}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <AnimatedIllustration
                src="/illustrations/robot_megaphone_announce.svg"
                alt=""
                width={380}
                height={380}
                priority
                floatVariant="normal"
                className="drop-shadow-[0_20px_60px_rgba(65,188,230,0.2)]"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── AT A GLANCE (TrustStrip) ────────────────────────── */}
      <Section
        tone="default"
        padding="md"
        overflow="visible"
        aria-labelledby="about-glance-title"
      >
        <SectionHeader
          id="about-glance-title"
          eyebrow={t("atGlance.badge")}
          title={t("atGlance.title")}
          align="center"
        />
        <TrustStrip items={trustItems} />
      </Section>

      {/* ── STORY ────────────────────────────────────────────── */}
      <Section
        tone="muted"
        padding="md"
        overflow="visible"
        aria-labelledby="about-story-title"
      >
        <SectionHeader
          id="about-story-title"
          eyebrow={t("story.badge")}
          title={t("story.title")}
          subtitle={t("story.description")}
          align="center"
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { title: t("story.card1Title"), desc: t("story.card1Desc") },
            { title: t("story.card2Title"), desc: t("story.card2Desc") },
            { title: t("story.card3Title"), desc: t("story.card3Desc") },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:border-night-400/40 hover:shadow-md"
            >
              <h3 className="mb-2 text-base font-bold text-foreground">{card.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── VISION + MISSION (merged into one balanced section) ── */}
      <Section
        tone="default"
        padding="md"
        overflow="visible"
        aria-labelledby="about-vision-title"
      >
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              id="about-vision-title"
              eyebrow={t("vision.badge")}
              title={t("vision.title")}
              align="left"
              className="mb-4"
            />
            <p className="mb-4 leading-relaxed text-muted-foreground">
              {t("vision.description1")}
            </p>
            <p className="leading-relaxed text-muted-foreground">
              {t("vision.description2")}
            </p>
          </div>
          <div className="flex items-center justify-center">
            <AnimatedIllustration
              src="/illustrations/robot_lightbulb_idea.svg"
              alt=""
              width={360}
              height={360}
              priority={false}
              floatVariant="delayed"
              entranceDelay="delay-150"
            />
          </div>
        </div>
        <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex items-center justify-center lg:order-first">
            <AnimatedIllustration
              src="/illustrations/robot_heart_support.svg"
              alt=""
              width={360}
              height={360}
              priority={false}
              floatVariant="normal"
              entranceDelay="delay-300"
            />
          </div>
          <div>
            <SectionHeader
              eyebrow={t("mission.badge")}
              title={t("mission.title")}
              align="left"
              className="mb-4"
            />
            <p className="mb-4 leading-relaxed text-muted-foreground">
              {t("mission.description1")}
            </p>
            <p className="leading-relaxed text-muted-foreground">
              {t("mission.description2")}
            </p>
          </div>
        </div>
      </Section>

      {/* ── TEAM (Core + Advisor regrouped) ─────────────────── */}
      <Section
        tone="muted"
        padding="md"
        overflow="visible"
        aria-labelledby="about-team-title"
      >
        <SectionHeader
          id="about-team-title"
          eyebrow={t("team.badge")}
          title={t("team.title")}
          align="center"
        />
        <div className="space-y-12">
          <div>
            <h3 className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("team.coreGroup")}
            </h3>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-6">
              {coreMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
          {advisorMembers.length > 0 && (
            <div>
              <h3 className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("team.advisorGroup")}
              </h3>
              <div className="mx-auto grid max-w-2xl grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-2">
                {advisorMembers.map((member) => (
                  <TeamMemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <Section
        tone="dark"
        padding="md"
        contained={false}
        aria-labelledby="about-contact-title"
      >
        <div className="relative mx-auto max-w-lg px-4 sm:px-6 lg:px-8 text-white">
          <div className="mb-8 text-center">
            <h2
              id="about-contact-title"
              className="mb-3 text-3xl font-extrabold"
            >
              {t("contact.title")}
            </h2>
            <p className="text-night-100/70">{t("contact.description")}</p>
          </div>
          <ContactForm />
        </div>
      </Section>

      {/* ── FAQ (demoted: collapsed below contact) ──────────── */}
      <Section
        id="faq"
        tone="default"
        padding="md"
        overflow="visible"
        aria-labelledby="about-faq-title"
      >
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            id="about-faq-title"
            eyebrow={t("faq.badge")}
            title={t("faq.title")}
            subtitle={t("faq.subtitle")}
            align="center"
          />

          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {faqCategories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2 ${
                    active
                      ? "bg-primary text-white"
                      : "border border-border bg-transparent text-muted-foreground hover:border-night-400 hover:text-foreground"
                  }`}
                >
                  {pickLocale(cat.label, locale)}
                </button>
              );
            })}
          </div>

          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((faq, i) => (
              <AccordionItem key={faq.id} value={`faq-${i}`}>
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

      {/* ── COMPLIANCE STRIP (replaces old disclaimer) ──────── */}
      <Section tone="default" padding="sm">
        <div className="mx-auto max-w-3xl">
          <ComplianceStrip />
        </div>
      </Section>
    </div>
  );
}
