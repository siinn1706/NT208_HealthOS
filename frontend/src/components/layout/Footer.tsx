"use client";

import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { BrandMarkIcon, brandMarkGlassBadgeSurfaceClassName } from "@/components/shared/auth/primitives";
import { cn } from "@/lib/utils";

const FOOTER_MENU_LINKS = [
  { labelKey: "blog", href: "/articles" },
  { labelKey: "menuServices", href: "/services" },
  { labelKey: "menuPlans", href: "/plans" },
] as const;

const FOOTER_HELP_LINKS = [
  { labelKey: "faq", href: "/about#faq" },
  { labelKey: "privacy", href: "/legal/privacy" },
] as const;

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute -left-20 bottom-20 size-64 rotate-12 rounded-3xl bg-gradient-to-br from-night-600/20 to-night-400/10 blur-sm" />
      <div className="absolute -right-20 bottom-20 size-64 -rotate-12 rounded-3xl bg-gradient-to-bl from-night-400/20 to-warm-peach/10 blur-sm" />

      {/* Logo mark */}
      <div className="flex justify-center pb-8 pt-16">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-2xl",
            brandMarkGlassBadgeSurfaceClassName,
          )}
        >
          <BrandMarkIcon className="size-8" />
        </div>
      </div>

      {/* Main footer content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 pb-12 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-foreground">{t("tagline")}</h3>
          </div>

          {/* Menu */}
          <nav aria-label={t("menuTitle")}>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("menuTitle")}
            </h4>
            <ul className="mt-4 space-y-3">
              {FOOTER_MENU_LINKS.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-night-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Help */}
          <nav aria-label={t("helpTitle")}>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("helpTitle")}
            </h4>
            <ul className="mt-4 space-y-3">
              {FOOTER_HELP_LINKS.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-night-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Copyright */}
        <div className="border-t border-border py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
