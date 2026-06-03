"use client";

import { usePathname, Link } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { Menu, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { BrandMarkIcon, brandMarkGlassBadgeSurfaceClassName } from "@/components/shared/auth/primitives";
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
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                brandMarkGlassBadgeSurfaceClassName,
              )}
            >
              <BrandMarkIcon className="size-5" />
            </div>
            <span className="text-xl font-bold text-white">
              Health<span className="text-night-300">OS</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 lg:flex">
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
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href={pathname}
              locale={otherLocale}
              className="flex items-center gap-1.5 rounded-full border border-night-500/40 bg-transparent px-3 py-1.5 text-sm font-medium text-night-200 transition-colors hover:bg-night-800 hover:text-white"
            >
              <Globe className="size-3.5" />
              {otherLocale.toUpperCase()}
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="rounded-full text-night-200 hover:text-white hover:bg-night-800">
                {t("signIn")}
              </Button>
            </Link>
            <Link href="/register">
              <Button className="rounded-full bg-gradient-to-r from-night-700 via-night-600 to-night-400 text-white shadow-md shadow-night-400/20 transition-[filter,box-shadow] duration-150 ease-out hover:brightness-110 hover:shadow-night-400/40">
                {t("register")} <ChevronRight className="ml-1 size-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="text-white hover:bg-night-800">
                <Menu className="size-6" />
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
                  <Globe className="size-4" />
                  {otherLocale === "vi" ? "Tiếng Việt" : "English"}
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full border-night-500/40 text-white hover:bg-night-800">
                    {t("signIn")}
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full rounded-full bg-gradient-to-r from-night-700 to-night-400 text-white shadow-md shadow-night-400/20 transition-[filter] duration-150 ease-out hover:brightness-110">
                    {t("register")} <ChevronRight className="ml-1 size-4" />
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
