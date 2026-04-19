import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Locale-aware 404 page. Rendered for any path under `/[locale]` that does
 * not match a route. Mirrors the StateView contract used elsewhere in the app
 * but stays a server component so it works without JS.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("state.errors");
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <span aria-hidden="true" className="text-lg font-semibold">
            404
          </span>
        </div>
        <h1 className="text-lg font-semibold text-foreground">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFoundDescription")}</p>
        <div className="mt-6 flex justify-center">
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/">
              <Home className="size-3.5" />
              {t("goHome")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
