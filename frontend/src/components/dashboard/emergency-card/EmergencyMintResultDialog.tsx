/**
 * EmergencyMintResultDialog — shows the freshly-minted QR + URL ONCE.
 *
 * The plaintext token and share URL only exist for the lifetime of this
 * dialog — once the owner closes it, they must re-mint to recover the
 * value. The QR PNG is downloadable so the owner can print / laminate /
 * embed in a wallet card.
 */
"use client";

import { Check, Clock, Copy, Download, FileText, X } from "lucide-react";
import * as React from "react";
import { useTranslations } from "next-intl";
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
import type { EmergencyShareTokenWithSecret } from "@/lib/emergency-card-types";

interface EmergencyMintResultDialogProps {
  result: EmergencyShareTokenWithSecret | null;
  onClose: () => void;
}

// H6 — auto-close the result dialog after 5 minutes so the plaintext
// token + share URL don't sit in a stale tab forever. The owner can
// still re-mint if they need the value again.
const AUTO_CLOSE_MS = 5 * 60 * 1000;

export function EmergencyMintResultDialog({
  result,
  onClose,
}: EmergencyMintResultDialogProps) {
  const t = useTranslations("dashboard.emergencyCard.mintResult");
  const [copied, setCopied] = React.useState(false);
  const [autoCloseRemainingS, setAutoCloseRemainingS] = React.useState(
    AUTO_CLOSE_MS / 1000
  );

  // H6 — countdown + auto-close. Resets on each open.
  React.useEffect(() => {
    if (!result) return;
    setAutoCloseRemainingS(AUTO_CLOSE_MS / 1000);
    const interval = window.setInterval(() => {
      setAutoCloseRemainingS((s) => Math.max(0, s - 1));
    }, 1000);
    const closeTimer = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(closeTimer);
    };
  }, [result, onClose]);

  if (!result) return null;

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.share_url);
      // L10 — keep "Copied" visible until the user closes the dialog or
      // copies again. No more 2s timer that leaves the user wondering.
      setCopied(true);
      toast.success(t("copiedToast"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  function labelSlug(): string {
    if (!result) return "emergency-card";
    return (result.token_meta.label || "emergency-card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleDownloadQr() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.qr_png_data_url;
    a.download = `${labelSlug()}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleDownloadWalletPdf() {
    if (!result?.wallet_pdf_data_url) return;
    const a = document.createElement("a");
    a.href = result.wallet_pdf_data_url;
    a.download = `${labelSlug()}-wallet.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Dialog
      open={!!result}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="size-4 text-emerald-600" aria-hidden />
            {t("title", { label: result.token_meta.label })}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Critical warning + H6 auto-close countdown */}
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-semibold">{t("warningTitle")}</p>
            <p className="mt-0.5">{t("warningBody")}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] opacity-80">
              <Clock className="size-3" aria-hidden />
              {t("autoCloseIn", {
                minutes: Math.floor(autoCloseRemainingS / 60),
                seconds: autoCloseRemainingS % 60,
              })}
            </p>
          </div>

          {/* QR + download */}
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
            <img
              src={result.qr_png_data_url}
              alt={t("qrAlt", { label: result.token_meta.label })}
              className="h-44 w-44 rounded-md border border-border bg-white"
              draggable={false}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                className="gap-1.5"
              >
                <Download className="size-3.5" aria-hidden />
                {t("downloadQr")}
              </Button>
              {result.wallet_pdf_data_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadWalletPdf}
                  className="gap-1.5"
                >
                  <FileText className="size-3.5" aria-hidden />
                  {t("downloadWalletPdf")}
                </Button>
              )}
            </div>
          </div>

          {/* Share URL + copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("urlLabel")}
            </p>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5">
              <code
                className="flex-1 select-all truncate font-mono text-[11px] text-foreground"
                title={result.share_url}
              >
                {result.share_url}
              </code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-7 shrink-0 gap-1 px-2"
                aria-label={t("copyUrl")}
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-600" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
                {copied ? t("copied") : t("copyUrl")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="gap-2"
          >
            <X className="size-3.5" aria-hidden />
            {t("done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
