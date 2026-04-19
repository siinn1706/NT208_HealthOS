import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";

/**
 * Root-level 404 fallback. Rendered when no `[locale]` segment matches at all.
 * Kept locale-agnostic and dependency-light so it works even if i18n bundles
 * fail to load. Sends the user back to the default locale's home page.
 *
 * NOTE: Do NOT render <html>/<body> here — Next.js App Router wraps this page
 * inside the root layout (`src/app/layout.tsx`), which already provides them
 * along with font/theme classes. Duplicating them causes hydration mismatches
 * because the layout's server-rendered attributes won't match this page's.
 */
export default function RootNotFound() {
  const home = `/${routing.defaultLocale}`;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <span aria-hidden="true" className="text-lg font-semibold">
            404
          </span>
        </div>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find the page you were looking for.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild size="sm" className="gap-1.5">
            <Link href={home}>
              <Home className="size-3.5" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
