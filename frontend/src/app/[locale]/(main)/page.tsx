"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/navigation";
import { useState, useRef, useEffect } from "react";
import { AnimatedIllustration } from "@/components/shared/AnimatedIllustration";
import { ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { PlanCard } from "@/components/shared/PlanCard";
import { TestimonialCard } from "@/components/shared/TestimonialCard";
import { ArticleCard } from "@/components/shared/ArticleCard";
import { ContactForm } from "@/components/shared/ContactForm";
import { coreFeatures, aiFeatures, realtimeFeatures, gamificationFeatures } from "@/data/services";
import { plans } from "@/data/plans";
import { testimonials } from "@/data/testimonials";
import { articles, articleCategories } from "@/data/articles";
import { stats } from "@/data/stats";
import { pickLocale } from "@/types";
import type { Locale } from "@/types";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";
import { AtmosphereGlow } from "@/components/shared/AtmosphereGlow";
import { Reveal } from "@/components/shared/Reveal";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;
  const [activeTab, setActiveTab] = useState("core");

  // Show only 2 popular/free plans on homepage
  const previewPlans = plans.slice(0, 3);
  // Show 3 latest articles
  const previewArticles = articles.slice(0, 3);

  // Testimonials scroll tracking (snap dots)
  const testimonialScrollRef = useRef<HTMLDivElement>(null);
  const testimonialItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);

  useEffect(() => {
    const container = testimonialScrollRef.current;
    if (!container) return;
    const items = testimonialItemRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = items.findIndex((r) => r === entry.target);
            if (idx !== -1) setActiveTestimonialIdx(idx);
          }
        }
      },
      { root: container, threshold: 0.5 },
    );
    items.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="pt-16 md:pt-20">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-night-900 via-night-800 to-night-900 py-20 md:py-28">
        <AtmosphereGrid variant="dots" tone="dark" interactive />
        <AtmosphereGlow variant="soft" />
        {/* Single warm nebula blob — cool bottom-left orb removed for calmer tone */}
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-warm-peach/12 blur-[90px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Text */}
            <div>
              <Badge className="mb-4 border-0 bg-gradient-to-r from-warm-rose/90 to-warm-peach/90 text-night-900 font-bold shadow-sm shadow-warm-rose/20 hover:from-warm-rose hover:to-warm-peach">
                {t("hero.badge")}
              </Badge>
              <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
                {t("hero.title")}{" "}
                <span className="bg-gradient-to-r from-night-400 to-night-300 bg-clip-text text-transparent">{t("hero.titleHighlight")}</span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-night-100/70">
                {t("hero.description")}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/plans">
                  <Button
                    size="lg"
                    data-event="home-hero-cta-click"
                    className="rounded-full bg-gradient-to-r from-night-700 via-night-600 to-night-400 text-white shadow-lg shadow-night-400/20 transition-all hover:scale-105 hover:shadow-night-400/40 hover:brightness-110"
                  >
                    {t("hero.cta")} <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button size="lg" variant="outline" className="rounded-full border-night-500/30 bg-white/5 text-white backdrop-blur-md transition-all hover:bg-white/10 hover:border-warm-peach/50 hover:text-warm-peach">
                    {t("exploreMore")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Floating card + robot illustration */}
            <div className="relative flex items-center justify-center">
              {/* Robot: fade-in-up entrance + gentle float, GPU-only transform */}
              <AnimatedIllustration
                src="/illustrations/robot_wave_hello.svg"
                alt=""
                width={384}
                height={384}
                priority
                floatVariant="normal"
                className="drop-shadow-[0_20px_60px_rgba(65,188,230,0.25)]"
              />
              {/* floating badge — sample illustration only, NOT a real metric */}
              <div
                className="absolute -bottom-4 -left-4 rounded-2xl border border-night-500/30 bg-night-900/90 p-4 shadow-xl shadow-night-400/10 backdrop-blur-md"
                role="img"
                aria-label={t("hero.floatingScoreAriaLabel")}
              >
                <p className="text-xs font-semibold bg-gradient-to-r from-night-400 to-night-300 bg-clip-text text-transparent">{t("hero.floatingBrand")}</p>
                <p className="text-xs text-night-100/80">{t("hero.floatingStatus")}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white" aria-hidden="true">92</span>
                  <span className="text-xs text-night-100/80">{t("hero.floatingScoreLabel")}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-night-100/50">
                  {t("hero.floatingScoreSample")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="border-y border-border/50 bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="text-center">
                <p className="text-3xl font-extrabold bg-gradient-to-r from-night-700 to-night-400 bg-clip-text text-transparent">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pickLocale(stat.label, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT PREVIEW ────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Robot: lazy-loaded below-the-fold, centred with float */}
            <div className="flex items-center justify-center">
              <AnimatedIllustration
                src="/illustrations/robot_welcome_cheer.svg"
                alt=""
                width={380}
                height={380}
                priority={false}
                floatVariant="delayed"
                entranceDelay="delay-150"
              />
            </div>
            <Reveal>
              <Badge className="mb-3 border-0 bg-gradient-to-r from-night-700/20 to-night-400/20 text-night-700 dark:text-night-300 hover:from-night-700/30 hover:to-night-400/30">
                {t("about.badge")}
              </Badge>
              <h2 className="mb-4 text-3xl font-extrabold text-foreground">
                {t("about.title")}
              </h2>
              <p className="mb-6 text-muted-foreground leading-relaxed">
                {t("about.description")}
              </p>
              <Link href="/about">
                <Button className="rounded-full bg-gradient-to-r from-night-700 to-night-500 text-white shadow-md shadow-night-600/20 transition-all hover:brightness-110 hover:shadow-night-500/30">
                  {t("exploreMore")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-3 border-0 bg-gradient-to-r from-warm-rose/80 to-warm-peach/80 text-night-900 font-semibold shadow-sm shadow-warm-rose/20 hover:from-warm-rose/90 hover:to-warm-peach/90">
              {t("features.badge")}
            </Badge>
            <h2 className="mb-3 text-3xl font-extrabold text-foreground">{t("features.title")}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{t("features.subtitle")}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mx-auto mb-10 flex w-fit gap-2 bg-background/50">
              <TabsTrigger value="core">{t("features.tab1")}</TabsTrigger>
              <TabsTrigger value="ai">{t("features.tab2")}</TabsTrigger>
              <TabsTrigger value="realtime">{t("features.tab3")}</TabsTrigger>
              <TabsTrigger value="goals">{t("features.tab4")}</TabsTrigger>
            </TabsList>

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

      {/* ── PLANS PREVIEW ───────────────────────────────────── */}
      <section className="relative overflow-hidden py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-3 border-0 bg-gradient-to-r from-night-700/20 to-night-400/20 text-night-700 dark:text-night-300 font-semibold hover:from-night-700/30 hover:to-night-400/30">
              {t("plans.badge")}
            </Badge>
            <h2 className="mb-3 text-3xl font-extrabold text-foreground">{t("plans.title")}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{t("plans.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {previewPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/plans">
              <Button variant="outline" className="rounded-full border-night-600/50 text-night-700 dark:text-night-300 transition-all hover:bg-gradient-to-r hover:from-night-700 hover:to-night-500 hover:text-white hover:border-transparent">
                {t("plans.viewPlans")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <Badge className="mb-3 border-0 bg-gradient-to-r from-warm-peach/70 to-warm-gold/70 text-night-900 font-semibold hover:from-warm-peach/90 hover:to-warm-gold/90">
              {t("testimonials.badge")}
            </Badge>
            <h2 className="text-3xl font-extrabold text-foreground">{t("testimonials.title")}</h2>
          </div>
          {/* Scroll container with snap + relative wrapper for the fade overlay */}
          <div className="relative">
            <div
              ref={testimonialScrollRef}
              className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
            >
              {testimonials.map((testimonial, idx) => (
                <div
                  key={testimonial.id}
                  ref={(el) => { testimonialItemRefs.current[idx] = el; }}
                  className="snap-start"
                >
                  <TestimonialCard testimonial={testimonial} />
                </div>
              ))}
            </div>
            {/* Right-edge peek affordance — hints at more content */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent"
            />
          </div>
          {/* Scroll indicator dots */}
          <div
            className="mt-4 flex justify-center gap-2"
            role="group"
            aria-label={t("testimonials.scrollIndicator")}
          >
            {testimonials.map((testimonial, idx) => (
              <button
                key={testimonial.id}
                type="button"
                aria-label={`${t("testimonials.goTo")} ${idx + 1}`}
                aria-current={activeTestimonialIdx === idx ? "true" : undefined}
                onClick={() => {
                  testimonialItemRefs.current[idx]?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                  });
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  activeTestimonialIdx === idx
                    ? "w-6 bg-foreground"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── ARTICLES PREVIEW ─────────────────────────────────── */}
      <section className="relative overflow-hidden py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Badge className="mb-2 border-0 bg-gradient-to-r from-night-600/20 to-night-300/20 text-night-700 dark:text-night-300 font-semibold hover:from-night-600/30 hover:to-night-300/30">
                {t("articles.badge")}
              </Badge>
              <h2 className="text-2xl font-extrabold text-foreground">{t("articles.title")}</h2>
            </div>
            <Link href="/articles" className="hidden sm:flex items-center gap-1 text-sm font-medium bg-gradient-to-r from-night-700 to-night-400 bg-clip-text text-transparent hover:from-night-600 hover:to-night-300">
              {t("articles.seeAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-col gap-5">
            {previewArticles.map((article) => {
              const cat = articleCategories.find((c) => c.id === article.categoryId);
              return (
                <ArticleCard
                  key={article.id}
                  article={article}
                  categoryLabel={cat ? pickLocale(cat.label, locale) : ""}
                />
              );
            })}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link href="/articles">
              <Button variant="outline" className="rounded-full border-night-600/50 text-night-700 dark:text-night-300 transition-all hover:bg-gradient-to-r hover:from-night-700 hover:to-night-400 hover:text-white hover:border-transparent">
                {t("articles.seeAll")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-night-900 via-night-800 to-night-900 py-20 text-white">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-night-400/15 blur-[100px]" />
        <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-warm-rose/10 blur-[80px]" />
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-extrabold">{t("contact.title")}</h2>
            <p className="text-night-100/70">{t("contact.description")}</p>
          </div>
          <ContactForm />
        </div>
      </section>

    </div>
  );
}
