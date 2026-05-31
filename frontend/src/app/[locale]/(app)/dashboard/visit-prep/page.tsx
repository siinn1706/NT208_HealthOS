import { ClipboardCheck, Plus } from "lucide-react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("visitPrep") };
}
import { Link } from "@/navigation";
import { PageHeader } from "@/components/shared/page";
import { BriefStatusBadge } from "@/components/dashboard/visit-prep/BriefStatusBadge";
import type { VisitBrief } from "@/types/api";

async function fetchBriefs(): Promise<VisitBrief[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/visit-briefs?page=1&per_page=50`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return [];
    const json = (await res.json().catch(() => null)) as
      | { data?: VisitBrief[] }
      | null;
    return Array.isArray(json?.data) ? (json!.data as VisitBrief[]) : [];
  } catch {
    return [];
  }
}

export default async function VisitPrepListPage() {
  const [t, briefs] = await Promise.all([
    getTranslations("dashboard.visitPrep"),
    fetchBriefs(),
  ]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" aria-hidden />
            {t("pageTitle")}
          </span>
        }
        description={t("pageSubtitle")}
        primaryAction={
          <Link
            href="/dashboard/visit-prep/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            aria-label={t("newBriefAria")}
          >
            <Plus className="size-4" />
            {t("newBrief")}
          </Link>
        }
      />
      <div className="max-w-[1200px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {briefs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <ClipboardCheck className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-foreground">{t("list.empty")}</p>
            <Link
              href="/dashboard/visit-prep/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("list.startCta")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {briefs.map((brief) => {
              const visitTypeKey = `visitTypes.${brief.visit_type}` as const;
              return (
                <li key={brief.id}>
                  <Link
                    href={`/dashboard/visit-prep/${brief.id}` as never}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {brief.title || t(visitTypeKey)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("list.updatedAt", {
                          when: new Date(brief.updated_at).toLocaleDateString(),
                        })}
                      </p>
                    </div>
                    <BriefStatusBadge status={brief.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
