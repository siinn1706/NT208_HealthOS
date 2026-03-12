"use client";

import { useState } from "react";
import { ReportQuickActions } from "./ReportQuickActions";
import { AutoShareBanner } from "./AutoShareBanner";
import { ShareReportDialog } from "./ShareReportDialog";
import { ExportPdfDialog } from "./ExportPdfDialog";
import type { HealthReport, EmergencyContact } from "@/types/api";

interface ReportHubWrapperProps {
  report: HealthReport;
  emergencyContacts: EmergencyContact[];
  locale: string;
}

/**
 * Client wrapper for the reports hub page.
 * Manages dialog open/close state so the page itself stays a Server Component.
 */
export function ReportHubWrapper({
  report,
  emergencyContacts,
  locale,
}: ReportHubWrapperProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [, setSettingsOpen] = useState(false);

  return (
    <>
      {/* Auto-share banner with countdown */}
      <AutoShareBanner
        report={report}
        onOpenShareDialog={() => setShareOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Quick action buttons */}
      <ReportQuickActions
        locale={locale}
        onExportPdf={() => setExportOpen(true)}
        onShare={() => setShareOpen(true)}
      />

      {/* Dialogs */}
      <ShareReportDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        report={report}
        emergencyContacts={emergencyContacts}
        locale={locale}
      />
      <ExportPdfDialog open={exportOpen} onOpenChange={setExportOpen} report={report} />
    </>
  );
}
