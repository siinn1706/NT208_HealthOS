"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Droplet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MedicationPlan } from "@/types/api";

interface RefillBannerProps {
  plan: MedicationPlan;
  onRefilled?: (plan: MedicationPlan) => void;
}

export function RefillBanner({ plan, onRefilled }: RefillBannerProps) {
  const t = useTranslations("dashboard.medications.detail.refill");
  const locale = useLocale();

  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setValue(String(plan.refill_supply_units ?? ""));
  }, [open, plan.refill_supply_units]);

  const supply = plan.refill_supply_units;
  const nextDate = plan.next_refill_estimated_at
    ? new Date(plan.next_refill_estimated_at)
    : null;
  const isOverdue = nextDate !== null && nextDate.getTime() < Date.now();
  const next = nextDate
    ? nextDate.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/v1/medications/${encodeURIComponent(plan.id)}/refill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supply_units: n }),
        },
      );
      if (!res.ok) {
        toast.error(t("logError"));
        return;
      }
      const json = await res.json().catch(() => null);
      const updated = (json?.data ?? null) as MedicationPlan | null;
      if (updated) onRefilled?.(updated);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label={t("title")}
      className="rounded-xl border border-warm-gold/40 bg-warm-gold/10 px-4 py-3 flex items-center gap-3"
    >
      <Droplet className="w-5 h-5 text-warm-gold flex-shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isOverdue ? t("overdue") : t("title")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {supply !== null ? t("supply", { n: supply }) : "—"}
          {next && <span> · {t("estimated", { date: next })}</span>}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {t("log")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("log")}</DialogTitle>
            <DialogDescription className="text-xs">{t("supplyHint")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="refill-supply">{t("supplyAfter")}</Label>
              <Input
                id="refill-supply"
                type="number"
                min={0}
                max={100000}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {saving ? t("saving") : t("log")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
