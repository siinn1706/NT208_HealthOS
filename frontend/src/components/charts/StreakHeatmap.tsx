"use client";

import { EChartWrapper } from "./EChartWrapper";
import type { EChartsOption } from "echarts";
import type { UserStreakEntry } from "@/data/gamification";

interface StreakHeatmapProps {
  entries: UserStreakEntry[];
  height?: number;
}

export function StreakHeatmap({ entries, height = 120 }: StreakHeatmapProps) {
  const weeks: UserStreakEntry[][] = [];
  for (let i = 0; i < entries.length; i += 7) {
    weeks.push(entries.slice(i, i + 7));
  }

  const data: [number, number, number][] = [];
  weeks.forEach((week, wi) => {
    week.forEach((entry, di) => {
      const value = entry.completed ? (entry.activitiesCount >= 2 ? 2 : 1) : 0;
      data.push([wi, di, value]);
    });
  });

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "var(--color-popover)",
      borderColor: "var(--color-border)",
      textStyle: { color: "var(--color-foreground)", fontSize: 12 },
      formatter: (p: unknown) => {
        const params = p as { data: [number, number, number] };
        const [wi, di] = params.data;
        const entry = weeks[wi]?.[di];
        if (!entry) return "";
        return `${entry.date}<br/>${entry.completed ? "Hoàn thành" : "Chưa hoàn thành"}`;
      },
    },
    grid: { top: 0, left: 2, right: 2, bottom: 0, containLabel: true },
    xAxis: { type: "category", data: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], show: false },
    yAxis: { type: "category", data: Array.from({ length: 8 }, (_, i) => `Tuần ${8 - i}`), show: false },
    visualMap: {
      show: false,
      min: 0,
      max: 2,
      inRange: {
        color: ["var(--color-muted)", "var(--color-accent)", "var(--color-primary)"],
      },
    },
    series: [
      {
        type: "heatmap",
        data,
        itemStyle: { borderRadius: 2, borderWidth: 1, borderColor: "var(--color-background)" },
        emphasis: { itemStyle: { shadowBlur: 5, shadowColor: "rgba(0,0,0,0.2)" } },
      },
    ],
  };

  return <EChartWrapper option={option} height={height} />;
}
