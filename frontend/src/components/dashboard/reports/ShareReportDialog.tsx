"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import {
  Share2,
  Plus,
  Trash2,
  Loader2,
  User,
  Mail,
  Phone,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReportShare } from "@/hooks/useReportShare";
import { formatDate } from "@/lib/format-utils";
import type { HealthReport, EmergencyContact, ShareRecipient, ShareChannel } from "@/types/api";

const EMPTY_EMERGENCY_CONTACTS: EmergencyContact[] = [];

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: HealthReport;
  emergencyContacts?: EmergencyContact[];
  locale: string;
}

interface RecipientForm {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  selected: boolean;
}

export function ShareReportDialog({
  open,
  onOpenChange,
  report,
  emergencyContacts = EMPTY_EMERGENCY_CONTACTS,
  locale,
}: ShareReportDialogProps) {
  const t = useTranslations("share");
  const router = useRouter();

  // Build initial recipients from emergency contacts
  const initialRecipients: RecipientForm[] = emergencyContacts.flatMap((c, i) =>
    c.name
      ? [{
          id: `ec-${i}`,
          name: c.name,
          email: "",
          phone: "",
          relationship: c.relationship ?? "",
          selected: true,
        }]
      : []
  );

  const [recipients, setRecipients] = useState<RecipientForm[]>(initialRecipients);
  const [channels, setChannels] = useState<ShareChannel[]>(["email"]);
  const [message, setMessage] = useState("");
  const statusLabel = { normal: "Bình thường", warning: "Cần chú ý", critical: "Cần can thiệp" }[report.status];

  const { sharing, shareToContacts } = useReportShare();

  function toggleChannel(ch: ShareChannel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  function addRecipient() {
    setRecipients((prev) => [
      ...prev,
      { id: `manual-${Date.now()}`, name: "", email: "", phone: "", relationship: "", selected: true },
    ]);
  }

  function removeRecipient(id: string) {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRecipient(id: string, field: keyof RecipientForm, value: string | boolean) {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  async function handleSend() {
    const selected: ShareRecipient[] = recipients.flatMap(({ name, email, phone, relationship, selected }) =>
      selected && email.includes("@")
        ? [{ name, email, phone: phone.trim() || undefined, relationship }]
        : []
    );

    if (selected.length === 0) {
      return;
    }

    await shareToContacts(report, selected, channels, message || undefined, locale);
    onOpenChange(false);
  }

  const selectedCount = recipients.filter((r) => r.selected && r.email.includes("@")).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Share2 className="size-4" aria-hidden />
            {t("title")}
          </SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 py-2">
            {/* Report preview */}
            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Báo cáo sức khoẻ: {report.period === "7d" ? "7 ngày" : report.period === "30d" ? "30 ngày" : "90 ngày"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {report.alerts.length} {t("alertsWord")} • {formatDate(report.generated_at, locale)}
                </p>
              </div>
              <Badge
                variant={report.status === "critical" ? "destructive" : report.status === "warning" ? "outline" : "secondary"}
                className="text-[10px]"
              >
                {statusLabel}
              </Badge>
            </div>

            <Separator />

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">{t("recipients")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addRecipient}
                >
                  <Plus className="size-3" aria-hidden />
                  {t("addRecipient")}
                </Button>
              </div>

              {recipients.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <AlertTriangle className="size-5 text-amber-500 mx-auto mb-2" aria-hidden />
                  <p className="text-xs text-muted-foreground">{t("noEmergencyContacts")}</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-7 text-xs mt-1 gap-1"
                    onClick={() => router.push(`/${locale}/dashboard/profile`)}
                  >
                    <ExternalLink className="size-3" aria-hidden />
                    {t("goToProfile")}
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {recipients.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sel-${r.id}`}
                          checked={r.selected}
                          onCheckedChange={(c) => updateRecipient(r.id, "selected", !!c)}
                        />
                        <Label htmlFor={`sel-${r.id}`} className="text-xs font-medium text-foreground cursor-pointer">
                          {r.name || "Người nhận mới"}
                        </Label>
                        {r.relationship && (
                          <span className="text-[10px] text-muted-foreground">({r.relationship})</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRecipient(r.id)}
                        aria-label="Xoá người nhận"
                      >
                        <Trash2 className="size-3" aria-hidden />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <User className="absolute left-2.5 top-2.5 size-3 text-muted-foreground" aria-hidden />
                        <Input
                          placeholder={t("name")}
                          value={r.name}
                          onChange={(e) => updateRecipient(r.id, "name", e.target.value)}
                          className="h-8 text-xs pl-7"
                          aria-label={t("name")}
                        />
                      </div>
                      <Input
                        placeholder={t("relationship")}
                        value={r.relationship}
                        onChange={(e) => updateRecipient(r.id, "relationship", e.target.value)}
                        className="h-8 text-xs"
                        aria-label={t("relationship")}
                      />
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 size-3 text-muted-foreground" aria-hidden />
                      <Input
                        type="email"
                        placeholder={t("email")}
                        value={r.email}
                        onChange={(e) => updateRecipient(r.id, "email", e.target.value)}
                        className="h-8 text-xs pl-7"
                        aria-label={t("email")}
                      />
                    </div>

                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 size-3 text-muted-foreground" aria-hidden />
                      <Input
                        type="tel"
                        placeholder={t("phone")}
                        value={r.phone}
                        onChange={(e) => updateRecipient(r.id, "phone", e.target.value)}
                        className="h-8 text-xs pl-7"
                        aria-label={t("phone")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Channels */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">{t("channels")}</p>
              <div className="space-y-2">
                {(["email", "in_app", "sms"] as ShareChannel[]).map((ch) => (
                  <div key={ch} className="flex items-center gap-2">
                    <Checkbox
                      id={`ch-${ch}`}
                      checked={channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(ch)}
                    />
                    <Label htmlFor={`ch-${ch}`} className="text-sm font-normal cursor-pointer">
                      {ch === "email"
                        ? t("channelEmail")
                        : ch === "in_app"
                        ? t("channelInApp")
                        : t("channelSms")}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Optional message */}
            <div>
              <Label htmlFor="share-message" className="text-sm font-semibold text-foreground">
                {t("message")}
              </Label>
              <Textarea
                id="share-message"
                placeholder={t("messagePlaceholder")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1">
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sharing || selectedCount === 0}
            className="flex-1 gap-2"
            aria-label={`${t("send")} (${selectedCount} người nhận)`}
          >
            {sharing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Share2 className="size-3.5" aria-hidden />
            )}
            {sharing ? t("sending") : `${t("send")} (${selectedCount})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
