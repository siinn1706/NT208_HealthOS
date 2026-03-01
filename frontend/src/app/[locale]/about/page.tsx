"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TeamMemberCard } from "@/components/shared/TeamMemberCard";
import { ContactForm } from "@/components/shared/ContactForm";
import { teamMembers } from "@/data/team";
import { faqs, faqCategories } from "@/data/faqs";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";

export default function AboutPage() {
  const t = useTranslations("about");
  const locale = useLocale() as Locale;
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredFaqs = activeCategory === "all"
    ? faqs
    : faqs.filter((f) => f.categoryId === activeCategory);

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-night-900 py-20">
        <div className="absolute -right-32 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                {t("hero.title")}
              </h1>
              <p className="text-lg leading-relaxed text-night-100/70">
                {t("hero.description")}
              </p>
            </div>
            <div className="flex items-center justify-center">
              {/* Robot Megaphone — priority since it is above the fold */}
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
      </section>

      {/* ── STORY ────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
              {t("story.badge")}
            </Badge>
            <h2 className="mb-3 text-3xl font-extrabold text-foreground">{t("story.title")}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{t("story.description")}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { title: t("story.card1Title"), desc: t("story.card1Desc") },
              { title: t("story.card2Title"), desc: t("story.card2Desc") },
              { title: t("story.card3Title"), desc: t("story.card3Desc") },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-border/50 bg-card p-6 text-center shadow-sm">
                <h3 className="mb-2 text-base font-bold text-foreground">{card.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VISION ───────────────────────────────────────────── */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
                {t("vision.badge")}
              </Badge>
              <h2 className="mb-4 text-3xl font-extrabold text-foreground">{t("vision.title")}</h2>
              <p className="mb-4 leading-relaxed text-muted-foreground">{t("vision.description1")}</p>
              <p className="leading-relaxed text-muted-foreground">{t("vision.description2")}</p>
            </div>
            <div className="flex items-center justify-center">
              {/* Robot Lightbulb — lazy loaded, below fold */}
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
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="flex items-center justify-center lg:order-first">
              {/* Robot Heart Support — lazy loaded, below fold */}
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
              <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
                {t("mission.badge")}
              </Badge>
              <h2 className="mb-4 text-3xl font-extrabold text-foreground">{t("mission.title")}</h2>
              <p className="mb-4 leading-relaxed text-muted-foreground">{t("mission.description1")}</p>
              <p className="leading-relaxed text-muted-foreground">{t("mission.description2")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM ─────────────────────────────────────────────── */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
              {t("team.badge")}
            </Badge>
            <h2 className="text-3xl font-extrabold text-foreground">{t("team.title")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
            {teamMembers.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
              {t("faq.badge")}
            </Badge>
            <h2 className="mb-3 text-3xl font-extrabold text-foreground">{t("faq.title")}</h2>
            <p className="text-muted-foreground">{t("faq.subtitle")}</p>
          </div>

          {/* Category filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {faqCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "bg-primary text-white"
                    : "border border-border bg-transparent text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {pickLocale(cat.label, locale)}
              </button>
            ))}
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
      </section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section className="bg-night-900 py-20 text-white">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-extrabold">{t("contact.title")}</h2>
            <p className="text-night-100/70">{t("contact.description")}</p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* ── DISCLAIMER ───────────────────────────────────────── */}
      <section className="border-t border-border bg-background py-8">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-sm font-semibold text-foreground">{t("disclaimer.title")}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("disclaimer.text")}</p>
        </div>
      </section>

    </div>
  );
}
