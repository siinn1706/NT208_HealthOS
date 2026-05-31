"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Sparkles, Brain, Download, BarChart2, UserCheck,
  ChevronRight, Crown, Zap, Shield, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Brain,      label: "Phân tích AI sâu",     desc: "Dự báo xu hướng 60 ngày" },
  { icon: Download,   label: "Xuất lịch sử",          desc: "PDF, Excel, CSV" },
  { icon: BarChart2,  label: "Biểu đồ nâng cao",     desc: "So sánh, overlay, heatmap" },
  { icon: UserCheck,  label: "Huấn luyện cá nhân",   desc: "Lịch tập AI theo sức khoẻ" },
  { icon: Shield,     label: "Bảo mật nâng cao",     desc: "Mã hóa end-to-end" },
  { icon: Zap,        label: "Cảnh báo tức thì",     desc: "Push notification real-time" },
];

const STATS = [
  { value: "1.200+", label: "người dùng Pro" },
  { value: "30",     label: "ngày thử miễn phí" },
  { value: "99K",    label: "đồng / tháng" },
];

const HIGHLIGHTS = [
  "Theo dõi xu hướng sức khoẻ 90 ngày với biểu đồ nâng cao",
  "Nhận cảnh báo bất thường theo thời gian thực qua push notification",
  "Xuất báo cáo PDF / Excel để mang đi khám bác sĩ",
  "Huấn luyện viên AI cá nhân hoá theo chỉ số của bạn",
];

const SIDE_HIGHLIGHTS = [
  "Nhắc nhở thuốc thông minh theo lịch cá nhân",
  "Đồng bộ lịch khám và lịch tập tự động",
  "Thông báo liều qua push notification real-time",
  "Xem lịch sử uống thuốc và lịch trình đầy đủ",
];

interface Props {
  variant?: "default" | "compact";
  fill?: boolean;
  /** Narrow column layout (dashboard sidebar) */
  narrow?: boolean;
}

export function UpgradeBannerWidget({ variant = "default", fill = false, narrow = false }: Props) {
  const locale = useLocale();
  const highlights = narrow ? SIDE_HIGHLIGHTS : HIGHLIGHTS;

  /* ── Fill mode (tall card, vertical layout) ──────────────────────────── */
  if (fill) {
    return (
      <div className={cn(
        "relative rounded-xl overflow-hidden border border-violet-200/60 dark:border-violet-800/40",
        "bg-gradient-to-b from-violet-950/60 via-indigo-950/50 to-purple-950/60",
        "h-full min-h-[280px] flex flex-col",
      )}>
        <div className="pointer-events-none absolute -top-12 -right-12 size-56 rounded-full bg-violet-500/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-56 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 rounded-full bg-purple-500/5 blur-2xl" aria-hidden />

        <div className={cn(
          "relative flex flex-col flex-1 gap-4 justify-between",
          narrow ? "p-4" : "px-6 py-5",
        )}>
          {/* Header + tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
                <Crown className="size-5 text-white" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-violet-300" aria-hidden />
                  HealthOS Pro
                </p>
                <p className="text-[11px] text-white/50">Mở khoá toàn bộ tính năng</p>
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              {narrow
                ? "Pro giúp bạn không bỏ lỡ liều thuốc, lịch khám và các nhắc nhở quan trọng mỗi ngày."
                : "Nâng cấp để xem đầy đủ xu hướng chỉ số, dự báo AI và báo cáo chuyên sâu — giúp bạn chủ động hơn trong việc chăm sóc sức khoẻ mỗi ngày."}
            </p>
          </div>

          {/* Features grid */}
          <div className={cn(
            "grid gap-x-4 gap-y-3 flex-1 content-start",
            narrow ? "grid-cols-1" : "grid-cols-2",
          )}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2 min-w-0">
                <div className="flex-shrink-0 mt-0.5 size-6 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className="size-3.5 text-violet-300" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white/90 leading-tight">{label}</p>
                  <p className="text-[10px] text-white/40 leading-tight mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Highlight bullets */}
          <ul className="space-y-1.5 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
            {highlights.map((text) => (
              <li key={text} className="flex items-start gap-2 text-[11px] text-white/55 leading-snug">
                <Sparkles className="size-3 text-violet-400 flex-shrink-0 mt-0.5" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className={cn("grid gap-2", narrow ? "grid-cols-1" : "grid-cols-3")}>
            {STATS.map(({ value, label }) => (
              <div key={label} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-center">
                <p className="text-sm font-bold text-violet-300 tabular-nums leading-none">{value}</p>
                <p className="text-[9px] text-white/40 mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Link
              href={`/${locale}/plans`}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold",
                "bg-gradient-to-r from-violet-500 to-indigo-600 text-white",
                "hover:from-violet-400 hover:to-indigo-500 transition-all duration-200",
                "shadow-lg shadow-violet-500/30",
              )}
            >
              Nâng cấp ngay
              <ChevronRight className="size-4" />
            </Link>
            <p className="text-[10px] text-white/30 text-center flex items-center justify-center gap-1">
              <Users className="size-3" />
              Dùng thử 30 ngày miễn phí · Huỷ bất cứ lúc nào
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Compact card (right column, narrow) ────────────────────────────── */
  if (variant === "compact") {
    return (
      <div className={cn(
        "relative rounded-xl overflow-hidden border border-violet-200/60 dark:border-violet-800/40",
        "bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50",
        "dark:from-violet-950/30 dark:via-purple-950/20 dark:to-indigo-950/30",
      )}>
        <div className="pointer-events-none absolute -top-6 -right-6 size-28 rounded-full bg-violet-400/10 blur-2xl" aria-hidden />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 flex-shrink-0">
              <Crown className="size-4 text-white" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-violet-500" aria-hidden />
                HealthOS Pro
              </p>
              <p className="text-[10px] text-muted-foreground">Mở khoá đầy đủ tính năng</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {FEATURES.slice(0, 4).map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-1.5 min-w-0">
                <div className="flex-shrink-0 mt-0.5 size-4 rounded bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Icon className="size-2.5 text-violet-600 dark:text-violet-400" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-foreground leading-tight truncate">{label}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href={`/${locale}/plans`}
            className={cn(
              "flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-bold",
              "bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
              "hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-md shadow-violet-500/25",
            )}>
            Nâng cấp ngay <ChevronRight className="size-3.5" />
          </Link>
          <p className="text-[10px] text-muted-foreground text-center -mt-1">Từ 99.000đ / tháng</p>
        </div>
      </div>
    );
  }

  /* ── Default banner (full-width, horizontal) ─────────────────────────── */
  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden border border-violet-200/60 dark:border-violet-800/40",
      "bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50",
      "dark:from-violet-950/30 dark:via-purple-950/20 dark:to-indigo-950/30",
    )}>
      <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full bg-violet-400/10 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-6 -left-6 size-32 rounded-full bg-indigo-400/10 blur-2xl" aria-hidden />
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
            <Crown className="size-5 text-white" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-violet-500" aria-hidden />
              HealthOS Pro
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mở khoá đầy đủ tính năng</p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FEATURES.slice(0, 4).map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-1.5 min-w-0">
              <div className="flex-shrink-0 mt-0.5 size-5 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Icon className="size-3 text-violet-600 dark:text-violet-400" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex-shrink-0 flex flex-col items-start sm:items-end gap-1">
          <Link href={`/${locale}/plans`}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap",
              "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25",
              "hover:from-violet-500 hover:to-indigo-500 transition-all duration-200",
            )}>
            Nâng cấp ngay <ChevronRight className="size-3.5" />
          </Link>
          <p className="text-[10px] text-muted-foreground">Từ 99.000đ / tháng</p>
        </div>
      </div>
    </div>
  );
}
