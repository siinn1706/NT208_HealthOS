"use client";

import { usePathname, Link } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { Menu, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_KEYS = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "services", href: "/services" },
  { key: "plans", href: "/plans" },
  { key: "articles", href: "/articles" },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === "vi" ? "en" : "vi";

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ease-out",
        scrolled
          ? "bg-night-900/95 backdrop-blur-md shadow-lg border-b border-night-400/20"
          : "bg-gradient-to-r from-night-900 via-night-900 to-night-800"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-night-700 to-night-400 shadow-md shadow-night-400/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">
              Health<span className="bg-gradient-to-r from-night-400 to-night-300 bg-clip-text text-transparent">OS</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_KEYS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  pathname === link.href
                    ? "text-night-300"
                    : "text-night-100/80 hover:text-white"
                )}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href={pathname}
              locale={otherLocale}
              className="flex items-center gap-1.5 rounded-full border border-night-500/40 bg-transparent px-3 py-1.5 text-sm font-medium text-night-200 transition-colors hover:bg-night-800 hover:text-white"
            >
              <Globe className="h-3.5 w-3.5" />
              {otherLocale.toUpperCase()}
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="rounded-full text-night-200 hover:text-white hover:bg-night-800">
                {t("signIn")}
              </Button>
            </Link>
            <Link href="/plans">
              <Button className="rounded-full bg-gradient-to-r from-night-700 via-night-600 to-night-400 text-white shadow-md shadow-night-400/20 transition-[filter,box-shadow] duration-150 ease-out hover:brightness-110 hover:shadow-night-400/40">
                {t("register")} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-white hover:bg-night-800">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-night-900 border-night-800 text-white">
              <SheetTitle className="text-white">Navigation</SheetTitle>
              <nav className="mt-8 flex flex-col gap-2">
                {NAV_KEYS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      pathname === link.href
                        ? "bg-night-800 text-night-300"
                        : "text-night-100/80 hover:bg-night-800 hover:text-white"
                    )}
                  >
                    {t(link.key)}
                  </Link>
                ))}
              </nav>
              <div className="mt-8 flex flex-col gap-3 px-4">
                <Link
                  href={pathname}
                  locale={otherLocale}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-night-500/40 bg-transparent py-2 text-sm font-medium text-white transition-colors hover:bg-night-800"
                >
                  <Globe className="h-4 w-4" />
                  {otherLocale === "vi" ? "Tiếng Việt" : "English"}
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full border-night-500/40 text-white hover:bg-night-800">
                    {t("signIn")}
                  </Button>
                </Link>
                <Link href="/plans" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full rounded-full bg-gradient-to-r from-night-700 to-night-400 text-white shadow-md shadow-night-400/20 transition-[filter] duration-150 ease-out hover:brightness-110">
                    {t("register")} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
