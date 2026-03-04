"use client";

import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { Facebook, Twitter, Linkedin, Instagram, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  const t = useTranslations("footer");

  const menuLinks = [
    { labelKey: "blog", href: "/articles" },
    { labelKey: "menuServices", href: "/services" },
    { labelKey: "menuPlans", href: "/plans" },
    { labelKey: "career", href: "#" },
    { labelKey: "partnership", href: "#" },
  ] as const;

  const helpLinks = [
    { labelKey: "faq", href: "/about#faq" },
    { labelKey: "terms", href: "#" },
    { labelKey: "privacy", href: "#" },
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
        <div className="grid grid-cols-1 gap-8 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-foreground">{t("tagline")}</h3>

            <div className="mt-6 flex gap-3">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-[color,border-color,box-shadow,opacity] duration-150 ease-out hover:bg-gradient-to-br hover:from-night-700 hover:to-night-400 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-night-400/20"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
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
                    className="text-sm text-muted-foreground transition-colors hover:text-night-400"
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
                    className="text-sm text-muted-foreground transition-colors hover:text-night-400"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Download & Doctor */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              {t("downloadTitle")}
            </h4>
            <div className="mt-4 flex gap-2">
              <a
                href="#"
                className="flex h-10 items-center rounded-lg bg-night-900 px-3 text-xs text-white transition-opacity hover:opacity-80"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                Google Play
              </a>
              <a
                href="#"
                className="flex h-10 items-center rounded-lg bg-night-900 px-3 text-xs text-white transition-opacity hover:opacity-80"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71,19.5C17.88,20.5 17,21.4 15.66,21.4C14.32,21.4 13.89,20.6 12.37,20.6C10.84,20.6 10.37,21.4 9.1,21.4C7.79,21.4 6.96,20.5 6.13,19.5C4.54,17.5 3.8,13.6 5.45,11.6C6.21,10.65 7.37,10 8.6,10C9.85,10 10.63,10.8 12.07,10.8C13.47,10.8 14.05,10 15.5,10C16.6,10 17.63,10.5 18.35,11.35C15.5,13 16.03,17 18.71,19.5M13,3.5C13.73,2.35 14.94,1.5 15.94,1.5C16.07,2.85 15.35,4.65 14.35,5.5C13.4,6.35 12.32,6.96 11.12,6.87C11,5.57 11.82,4.55 13,3.5Z" />
                </svg>
                App Store
              </a>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-foreground">{t("forDoctors")}</p>
              <Button
                variant="outline"
                className="mt-2 rounded-full border-night-600/50 text-night-700 dark:text-night-300 transition-[color,border-color,background-color] duration-150 ease-out hover:bg-gradient-to-r hover:from-night-700 hover:to-night-400 hover:text-white hover:border-transparent"
              >
                {t("joinAsDoctor")} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
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
