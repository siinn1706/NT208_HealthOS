"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page";
import { VisitPrepDisclaimer } from "@/components/dashboard/visit-prep/Disclaimer";
import { VisitTypePicker } from "@/components/dashboard/visit-prep/VisitTypePicker";
import { createBrief } from "@/components/dashboard/visit-prep/VisitPrepApi";
import type { VisitType } from "@/types/api";

export default function NewVisitPrepPage() {
  const t = useTranslations("dashboard.visitPrep");
  const tWiz = useTranslations("dashboard.visitPrep.wizard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const attachToAppointmentId = searchParams.get("attach");

  const [visitType, setVisitType] = useState<VisitType>("gp_routine");
  const [creating, setCreating] = useState(false);

  async function handleStart() {
    setCreating(true);
    try {
      const brief = await createBrief({
        visit_type: visitType,
        attach_to_appointment_id: attachToAppointmentId,
      });
      router.push(
        attachToAppointmentId
          ? (`/dashboard/visit-prep/${brief.id}?attach=${attachToAppointmentId}` as never)
          : (`/dashboard/visit-prep/${brief.id}` as never),
      );
    } catch {
      toast.error(t("errors.saveFailed"));
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            {tWiz("steps.visitType")}
          </span>
        }
        description={t("pageSubtitle")}
      />
      <div className="max-w-[800px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <VisitPrepDisclaimer />
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <VisitTypePicker value={visitType} onChange={setVisitType} disabled={creating} />
        </section>
        <button
          type="button"
          onClick={handleStart}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {creating && <Loader2 className="size-3.5 animate-spin" />}
          {creating ? tWiz("autoSaving") : tWiz("next")}
        </button>
      </div>
    </>
  );
}
