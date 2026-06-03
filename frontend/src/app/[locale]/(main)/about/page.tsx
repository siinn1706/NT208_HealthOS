// oxlint-disable react-doctor/nextjs-missing-metadata -- About metadata is supplied by the route layout.
import { getTranslations, getLocale } from "next-intl/server";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { TeamMemberCard } from "@/components/shared/TeamMemberCard";
import { ContactForm } from "@/components/shared/ContactForm";
import { Section } from "@/components/shared/Section";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TrustStrip, type TrustItem } from "@/components/shared/TrustStrip";
import { ComplianceStrip } from "@/components/shared/ComplianceStrip";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";
import { AtmosphereGlow } from "@/components/shared/AtmosphereGlow";
import { MarketingAboutFaqIsland } from "@/components/shared/marketing-about-faq-island";
import { teamMembers } from "@/data/team";
import { faqs, faqCategories } from "@/data/faqs";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";
import { Users, Stethoscope, FileLock, Activity } from "lucide-react";

export default async function AboutPage() {
  const t = await getTranslations("about");
  const locale = (await getLocale()) as Locale;

  const trustItems: TrustItem[] = [
    { id: "project", value: "NT208", label: t("atGlance.project"), icon: Users },
    { id: "team", value: "Group 3", label: t("atGlance.team"), icon: Stethoscope },
    { id: "year", value: "2026", label: t("atGlance.year"), icon: FileLock },
    { id: "university", value: "UIT", label: t("atGlance.university"), icon: Activity },
  ];

  const coreMembers = teamMembers.filter((m) => (m.group ?? "core") === "core");
  const advisorMembers = teamMembers.filter((m) => m.group === "advisor");

  const resolvedFaqs = faqs.map((f) => ({
    id: f.id,
    categoryId: f.categoryId,
    question: pickLocale(f.question, locale),
    answer: pickLocale(f.answer, locale),
  }));

  const resolvedFaqCategories = faqCategories.map((cat) => ({
    id: cat.id,
    label: pickLocale(cat.label, locale),
  }));

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <Section tone="dark" padding="lg" contained={false} aria-labelledby="about-hero-title">
        <AtmosphereGrid variant="dots" tone="dark" interactive />
        <AtmosphereGlow variant="soft" static />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h1 id="about-hero-title" className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
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

      {/* ── AT A GLANCE ──────────────────────────────────────── */}
      <Section padding="sm" overflow="visible" aria-label={t("atGlance.title")}>
        <TrustStrip items={trustItems} />
      </Section>

      {/* ── STORY ────────────────────────────────────────────── */}
      <Section padding="md" aria-labelledby="about-story-title">
        <SectionHeader
          id="about-story-title"
          eyebrow={t("story.badge")}
          title={t("story.title")}
          subtitle={t("story.description")}
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { title: t("story.card1Title"), desc: t("story.card1Desc") },
            { title: t("story.card2Title"), desc: t("story.card2Desc") },
            { title: t("story.card3Title"), desc: t("story.card3Desc") },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
              <h3 className="mb-2 text-base font-bold text-foreground">{card.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── WHY HEALTHOS ─────────────────────────────────────── */}
      <Section tone="muted" padding="md" aria-labelledby="about-why-title">
        <SectionHeader
          id="about-why-title"
          eyebrow={t("why.badge")}
          title={t("why.title")}
          subtitle={t("why.subtitle")}
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <article className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 items-center rounded-full bg-gradient-to-r from-night-700/15 to-night-400/15 px-3 text-xs font-semibold uppercase tracking-wider text-night-700 dark:text-night-300">
                {t("vision.badge")}
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">{t("vision.title")}</h3>
            <p className="leading-relaxed text-muted-foreground">{t("vision.description1")}</p>
            <p className="leading-relaxed text-muted-foreground">{t("vision.description2")}</p>
          </article>
          <article className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 items-center rounded-full bg-gradient-to-r from-warm-rose/20 to-warm-peach/20 px-3 text-xs font-semibold uppercase tracking-wider text-warm-rose dark:text-warm-peach">
                {t("mission.badge")}
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">{t("mission.title")}</h3>
            <p className="leading-relaxed text-muted-foreground">{t("mission.description1")}</p>
            <p className="leading-relaxed text-muted-foreground">{t("mission.description2")}</p>
          </article>
        </div>
      </Section>

      {/* ── TEAM ─────────────────────────────────────────────── */}
      <Section padding="md" aria-labelledby="about-team-title">
        <SectionHeader
          id="about-team-title"
          eyebrow={t("team.badge")}
          title={t("team.title")}
        />
        {coreMembers.length > 0 && (
          <div className="mb-10">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("team.coreGroup")}
            </h3>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
              {coreMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
        {advisorMembers.length > 0 && (
          <div>
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("team.advisorGroup")}
            </h3>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
              {advisorMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <Section id="faq" tone="muted" padding="sm" aria-labelledby="about-faq-title">
        <MarketingAboutFaqIsland
          faqs={resolvedFaqs}
          faqCategories={resolvedFaqCategories}
          badge={t("faq.badge")}
          title={t("faq.title")}
          subtitle={t("faq.subtitle")}
        />
      </Section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <Section tone="dark" padding="lg" contained={false} aria-labelledby="about-contact-title">
        <div className="relative mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 id="about-contact-title" className="mb-3 text-3xl font-extrabold">{t("contact.title")}</h2>
            <p className="text-night-100/80">{t("contact.description")}</p>
          </div>
          <ContactForm />
        </div>
      </Section>

      {/* ── COMPLIANCE ───────────────────────────────────────── */}
      <Section padding="sm">
        <div className="mx-auto max-w-3xl">
          <ComplianceStrip />
        </div>
      </Section>

    </div>
  );
}
