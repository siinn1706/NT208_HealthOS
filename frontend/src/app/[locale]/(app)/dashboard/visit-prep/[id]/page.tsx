import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { VisitPrepWizardClient } from "@/components/dashboard/visit-prep/VisitPrepWizardClient";
import type { VisitBriefDetail } from "@/types/api";

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

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attach?: string }>;
}

export default async function VisitPrepDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { attach } = await searchParams;
  const brief = await fetchBrief(id);
  if (!brief) {
    notFound();
  }
  return (
    <VisitPrepWizardClient
      initial={brief}
      attachToAppointmentId={attach ?? null}
    />
  );
}
