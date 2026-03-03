"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HealthReport, ReportSection } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExportPdfButtonProps {
  report?: HealthReport;
  section?: ReportSection;
  variant?: "button" | "icon";
}

// ─── PDF generation (client-side, no external lib needed for MVP) ────────────

async function generateAndDownloadPdf(
  report: HealthReport,
  options: {
    includeDataTable: boolean;
    includeAiInsights: boolean;
    sectionsToInclude: string[];
  }
) {
  // Phase 1: Generate a structured HTML snapshot and use window.print()
  // Phase 2: Use @react-pdf/renderer with a full PDF template
  // For now: open a printable report in a new tab

  const w = window.open("", "_blank");
  if (!w) {
    toast.error("Không thể mở cửa sổ tải xuống. Vui lòng cho phép popup.");
    return;
  }

  const sections = report.sections.filter((s) =>
    options.sectionsToInclude.includes(s.category)
  );

  const statusLabel = {
    normal:   "Bình thường",
    warning:  "Cần chú ý",
    critical: "Cần can thiệp",
  }[report.status];

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Báo cáo sức khoẻ HealthOS — ${report.period}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; color: #0F2743; padding: 32px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; font-weight: 700; color: #1B3A5C; }
    h2 { font-size: 14px; font-weight: 600; color: #1B3A5C; border-bottom: 1px solid #E0F4F9; padding-bottom: 6px; margin: 20px 0 10px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-normal   { background: #d1fae5; color: #065f46; }
    .badge-warning  { background: #fef3c7; color: #92400e; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #41BCE6; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { font-size: 18px; font-weight: 800; color: #41BCE6; letter-spacing: -0.5px; }
    .meta { font-size: 11px; color: #6B7280; margin-top: 4px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
    .stat-card { border: 1px solid #E0F4F9; border-radius: 8px; padding: 10px 12px; }
    .stat-label { font-size: 10px; color: #6B7280; }
    .stat-value { font-size: 18px; font-weight: 700; color: #1B3A5C; }
    .stat-unit { font-size: 10px; color: #6B7280; margin-left: 2px; }
    .alert-row { display: flex; gap: 8px; align-items: flex-start; padding: 8px; background: #fef3c7; border-radius: 6px; margin: 4px 0; }
    .alert-icon { font-size: 14px; }
    .alert-text { font-size: 11px; line-height: 1.5; }
    .summary-text { font-size: 12px; color: #374151; line-height: 1.6; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { background: #E0F4F9; padding: 6px 8px; text-align: left; font-weight: 600; }
    td { padding: 4px 8px; border-bottom: 1px solid #F3F4F6; }
    .footer { margin-top: 32px; font-size: 10px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">⚕ HealthOS</div>
      <div class="meta">Báo cáo sức khoẻ cá nhân</div>
    </div>
    <div style="text-align:right">
      <span class="badge badge-${report.status}">${statusLabel}</span>
      <div class="meta">Kỳ: ${report.period === "7d" ? "7 ngày" : report.period === "30d" ? "30 ngày" : "90 ngày"}</div>
      <div class="meta">Tạo lúc: ${new Date(report.generated_at).toLocaleDateString("vi-VN")}</div>
    </div>
  </div>

  ${report.alerts.length > 0 ? `
    <h2>⚠ Tổng hợp cảnh báo (${report.alerts.length})</h2>
    ${report.alerts.map(a => `
      <div class="alert-row">
        <span class="alert-icon">${a.severity === "critical" ? "🔴" : "🟡"}</span>
        <div class="alert-text"><strong>${a.metric}:</strong> ${a.message}</div>
      </div>
    `).join("")}
  ` : ""}

  ${sections.map((s) => {
    const trendLabel = { improving: "Cải thiện", stable: "Ổn định", declining: "Giảm sút" }[s.stats.trend];
    const categoryLabels: Record<string, string> = {
      vitals: "Chỉ số sinh tồn", nutrition: "Dinh dưỡng",
      activity: "Hoạt động", sleep: "Giấc ngủ",
      bmi: "BMI & Cân nặng", medication: "Tuân thủ thuốc",
    };
    return `
      <h2>${categoryLabels[s.category] ?? s.category}</h2>
      <p class="summary-text">${s.summary}</p>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Trung bình</div><div class="stat-value">${s.stats.average.toLocaleString()}<span class="stat-unit">${s.stats.unit}</span></div></div>
        <div class="stat-card"><div class="stat-label">Thấp nhất</div><div class="stat-value">${s.stats.min.toLocaleString()}<span class="stat-unit">${s.stats.unit}</span></div></div>
        <div class="stat-card"><div class="stat-label">Cao nhất</div><div class="stat-value">${s.stats.max.toLocaleString()}<span class="stat-unit">${s.stats.unit}</span></div></div>
      </div>
      <p style="font-size:11px;color:#6B7280">Xu hướng: ${trendLabel} (${s.stats.change_percent > 0 ? "+" : ""}${s.stats.change_percent}%)</p>
      ${s.alerts.length > 0 ? s.alerts.map(a => `<div class="alert-row"><span class="alert-icon">${a.severity === "critical" ? "🔴" : "🟡"}</span><div class="alert-text">${a.message}</div></div>`).join("") : ""}
      ${options.includeDataTable && s.data.length > 0 ? `
        <table>
          <thead><tr><th>Ngày</th><th>Giá trị</th></tr></thead>
          <tbody>${s.data.slice(0, 14).map(d => `<tr><td>${d.date}</td><td>${d.value.toLocaleString()} ${s.stats.unit}</td></tr>`).join("")}</tbody>
        </table>
      ` : ""}
    `;
  }).join("")}

  <div class="footer">
    Báo cáo được tạo tự động bởi HealthOS • Thông tin mang tính tham khảo, không thay thế tư vấn y khoa chuyên nghiệp
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  w.document.write(html);
  w.document.close();
}

// ─── Dialog Component ─────────────────────────────────────────────────────────

interface ExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: HealthReport;
}

export function ExportPdfDialog({ open, onOpenChange, report }: ExportPdfDialogProps) {
  const t = useTranslations("reports");
  const [generating, setGenerating] = useState(false);
  const [includeDataTable, setIncludeDataTable] = useState(true);
  const [includeAiInsights, setIncludeAiInsights] = useState(true);
  const [selectedSections, setSelectedSections] = useState<string[]>(
    report.sections.map((s) => s.category)
  );

  const categoryLabels: Record<string, string> = {
    vitals: "Chỉ số sinh tồn",
    nutrition: "Dinh dưỡng",
    activity: "Hoạt động thể chất",
    sleep: "Giấc ngủ",
    bmi: "BMI & Cân nặng",
    medication: "Tuân thủ dùng thuốc",
  };

  function toggleSection(cat: string) {
    setSelectedSections((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleExport() {
    if (selectedSections.length === 0) {
      toast.error("Vui lòng chọn ít nhất một danh mục.");
      return;
    }
    setGenerating(true);
    const exportPromise = generateAndDownloadPdf(report, {
      includeDataTable,
      includeAiInsights,
      sectionsToInclude: selectedSections,
    });
    toast.promise(exportPromise, {
      loading: t("exportPdfLoading"),
      success: t("exportPdfSuccess"),
      error: "Tạo PDF thất bại",
    });
    await exportPromise;
    setGenerating(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" aria-hidden />
            {t("exportPdf")}
          </DialogTitle>
          <DialogDescription>
            Chọn nội dung bao gồm trong file PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Section selector */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Danh mục báo cáo</p>
            <div className="space-y-2">
              {report.sections.map((s) => (
                <div key={s.category} className="flex items-center gap-2">
                  <Checkbox
                    id={`section-${s.category}`}
                    checked={selectedSections.includes(s.category)}
                    onCheckedChange={() => toggleSection(s.category)}
                  />
                  <Label htmlFor={`section-${s.category}`} className="text-sm font-normal cursor-pointer">
                    {categoryLabels[s.category] ?? s.category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Tuỳ chọn</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="opt-table"
                  checked={includeDataTable}
                  onCheckedChange={(c) => setIncludeDataTable(!!c)}
                />
                <Label htmlFor="opt-table" className="text-sm font-normal cursor-pointer">
                  Bao gồm bảng dữ liệu thô
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="opt-ai"
                  checked={includeAiInsights}
                  onCheckedChange={(c) => setIncludeAiInsights(!!c)}
                />
                <Label htmlFor="opt-ai" className="text-sm font-normal cursor-pointer">
                  Bao gồm nhận xét AI
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button size="sm" onClick={handleExport} disabled={generating} className="gap-2">
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden />
            )}
            {generating ? t("exportPdfLoading") : t("exportPdf")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline Export Button (convenience wrapper) ───────────────────────────────

interface ExportPdfInlineButtonProps {
  report: HealthReport;
  size?: "sm" | "default";
}

export function ExportPdfInlineButton({ report, size = "sm" }: ExportPdfInlineButtonProps) {
  const t = useTranslations("reports");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className="gap-2 text-xs"
        onClick={() => setOpen(true)}
        aria-label={t("exportPdf")}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {t("exportPdf")}
      </Button>
      <ExportPdfDialog open={open} onOpenChange={setOpen} report={report} />
    </>
  );
}
