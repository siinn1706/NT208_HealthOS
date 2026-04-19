"use client";

import * as React from "react";
import { usePathname, useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * B7 P10 — Hooks `?pdf=<request_id>` in the URL into the signed-download flow.
 *
 * Triggered when the user clicks the "Your PDF report is ready" notification
 * (deep-link `/dashboard/reports?pdf=<id>`). Hits the BFF's signed-URL
 * endpoint and opens the resulting URL in a new tab so the browser handles
 * the actual download. Renders nothing.
 *
 * B7 review P2-1 — after triggering the download (or surfacing an error),
 * scrub `?pdf=` from the URL so a refresh doesn't re-fire the effect.
 */
export function PdfDownloadHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard.reports");
  // Track ids we've already handled this mount so the same `?pdf=…`
  // doesn't re-trigger when `searchParams` reference changes for unrelated
  // reasons (e.g. another query-param flip).
  const handledRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const id = searchParams.get("pdf");
    if (!id || handledRef.current.has(id)) return;
    handledRef.current.add(id);

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/v1/reports/export-pdf/${encodeURIComponent(id)}/download`,
        );
        if (cancelled) return;
        if (res.status === 410) {
          toast.error(t("exportPdfExpired"));
        } else if (!res.ok) {
          toast.error(t("exportPdfDownloadFailed"));
        } else {
          const json = await res.json().catch(() => null);
          const url: string | undefined = json?.data?.url;
          if (url) window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch {
        toast.error(t("exportPdfDownloadFailed"));
      } finally {
        // Scrub the query param so a refresh / re-mount doesn't re-download.
        const next = new URLSearchParams(searchParams.toString());
        next.delete("pdf");
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, t, router, pathname]);

  return null;
}
