"use client";

import { X, Pill, Stethoscope, CalendarDays, Building2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Prescription } from "@/types/api";

interface PrescriptionViewerDialogProps {
  prescription: Prescription | null;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Uống trước ăn": "#41BCE6",
  "Uống sau ăn": "#A3E4A0",
  default: "#E7DEA7",
};

export function PrescriptionViewerDialog({
  prescription,
  onClose,
}: PrescriptionViewerDialogProps) {
  if (!prescription) return null;

  const issued = new Date(prescription.issuedAt);
  const dateStr = issued.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xem toa thuốc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />

      {/* Sheet */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl",
          "bg-card border border-border shadow-2xl",
          "max-h-[92dvh] flex flex-col overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#41BCE6]/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#41BCE6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Toa thuốc</p>
            <p className="text-xs text-muted-foreground mt-0.5">{prescription.diagnosis}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Meta info strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Stethoscope, label: "Bác sĩ", value: prescription.doctor },
              { icon: Building2, label: "Cơ sở", value: prescription.clinic },
              {
                icon: CalendarDays,
                label: "Ngày kê đơn",
                value: dateStr,
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-background p-3 flex items-start gap-2.5"
              >
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-xs font-medium text-foreground mt-0.5 truncate">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Medicine list */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Pill className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                Danh sách thuốc ({prescription.medicines.length})
              </p>
            </div>
            <ul className="space-y-3">
              {prescription.medicines.map((med, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-background p-4 space-y-2"
                >
                  {/* Drug name + dosage */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {med.name}
                    </p>
                    <span
                      className="flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{
                        background: `${CATEGORY_COLORS.default}20`,
                        color: CATEGORY_COLORS.default,
                      }}
                    >
                      {med.dosage}
                    </span>
                  </div>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tần suất: </span>
                      <span className="text-foreground font-medium">{med.frequency}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Thời gian: </span>
                      <span className="text-foreground font-medium">{med.duration}</span>
                    </div>
                  </div>
                  {med.notes && (
                    <p className="text-[11px] text-muted-foreground italic border-t border-border pt-2">
                      {med.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Doctor notes */}
          {prescription.notes && (
            <div className="rounded-xl border border-[#E7DEA7]/40 bg-[#E7DEA7]/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[#E7DEA7] mb-1">
                Ghi chú của bác sĩ
              </p>
              <p className="text-xs text-foreground leading-relaxed">{prescription.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0 bg-muted/20">
          <p className="text-[10px] text-muted-foreground text-center leading-snug">
            Toa thuốc chỉ có giá trị tham khảo. Không tự ý thay đổi liều lượng mà không có hướng dẫn của bác sĩ.
          </p>
        </div>
      </div>
    </div>
  );
}
