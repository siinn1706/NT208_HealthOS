"use client";

import { Link } from "@/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  const menuLinks = [
    { labelKey: "blog", href: "/articles" },
    { labelKey: "menuServices", href: "/services" },
    { labelKey: "menuPlans", href: "/plans" },
  ] as const;

  const helpLinks = [
    { labelKey: "faq", href: "/about#faq" },
    { labelKey: "privacy", href: "/legal/privacy" },
  ] as const;
  return (
    <footer className="relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute -left-20 bottom-20 h-64 w-64 rotate-12 rounded-3xl bg-gradient-to-br from-night-600/20 to-night-400/10 blur-sm" />
      <div className="absolute -right-20 bottom-20 h-64 w-64 -rotate-12 rounded-3xl bg-gradient-to-bl from-night-400/20 to-warm-peach/10 blur-sm" />

      {/* Logo mark */}
      <div className="flex justify-center pb-8 pt-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-night-700/20 to-night-400/20 shadow-inner border border-night-400/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-night-700 dark:text-night-300">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
              fill="currentColor"
            />
          </svg>
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
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("menuTitle")}
            </h4>
            <ul className="mt-4 space-y-3">
              {menuLinks.map((link) => (
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
          </div>

          {/* Help */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("helpTitle")}
            </h4>
            <ul className="mt-4 space-y-3">
              {helpLinks.map((link) => (
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
          </div>
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
