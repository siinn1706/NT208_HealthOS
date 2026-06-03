import { Link } from "@/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default async function ForbiddenPage() {
  const t = await getTranslations("admin.forbidden");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        <div
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[var(--admin-status-danger-soft)] text-[var(--admin-status-danger)]"
          aria-hidden="true"
        >
          <ShieldX className="size-7" />
        </div>

        <h1 className="text-xl font-semibold text-[var(--admin-fg)]">
          {t("title")}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[var(--admin-fg-muted)]">
          {t("description")}
        </p>

        <div className="mt-7 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Button asChild size="sm">
            <Link href="/dashboard">{t("back")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

