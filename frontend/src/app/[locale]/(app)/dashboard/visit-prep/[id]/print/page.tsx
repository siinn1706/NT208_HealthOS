import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import type { VisitBriefDetail } from "@/types/api";
import { PrintableBrief } from "@/components/dashboard/visit-prep/PrintableBrief";

async function fetchBrief(id: string): Promise<VisitBriefDetail | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const reqHeaders = await headers();
    const res = await fetch(
      `${appUrl}/api/v1/visit-briefs/${encodeURIComponent(id)}`,
      { cache: "no-store", headers: { cookie: reqHeaders.get("cookie") ?? "" } },
    );
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as
      | { data?: VisitBriefDetail }
      | null;
    return json?.data ?? null;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrintBriefPage({ params }: Props) {
  const { id } = await params;
  const [brief, t, tCat, tType, locale] = await Promise.all([
    fetchBrief(id),
    getTranslations("dashboard.visitPrep"),
    getTranslations("dashboard.visitPrep.concernCategories"),
    getTranslations("dashboard.visitPrep.visitTypes"),
    getLocale(),
  ]);
  if (!brief) {
    notFound();
  }
  return (
    <PrintableBrief
      brief={brief}
      locale={locale}
      labels={{
        title: t("pageTitle"),
        disclaimer: t("disclaimer"),
        concernsHeader: t("review.concernsHeader"),
        questionsHeader: t("review.questionsHeader"),
        routingHeader: t("review.routingHeader"),
        attachHeader: t("review.attachHeader"),
        attachNone: t("review.attachNone"),
        finalizedTitle: t("finalized.title"),
        visitType: tType(brief.visit_type),
      }}
      categoryLabels={{
        pain: tCat("pain"),
        fever: tCat("fever"),
        gi: tCat("gi"),
        resp: tCat("resp"),
        mental: tCat("mental"),
        skin: tCat("skin"),
        neuro: tCat("neuro"),
        cardio: tCat("cardio"),
        other: tCat("other"),
      }}
    />
  );
}
