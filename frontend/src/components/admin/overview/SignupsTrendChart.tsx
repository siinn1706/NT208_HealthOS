"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

interface SignupDataPoint {
  date: string;
  count: number;
}

interface SignupsTrendChartProps {
  data: SignupDataPoint[] | null | undefined;
  isLoading?: boolean;
}

/** 30-day signups area chart using echarts-for-react. */
export function SignupsTrendChart({ data, isLoading }: SignupsTrendChartProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
        <p className="text-sm text-[var(--admin-fg-subtle)]">No signup data</p>
      </div>
    );
  }

  const option = {
    backgroundColor: "transparent",
    grid: { top: 16, right: 8, bottom: 32, left: 48, containLabel: false },
    tooltip: {
      trigger: "axis",
      backgroundColor: "var(--admin-surface-raised)",
      borderColor: "var(--admin-border)",
      textStyle: { color: "var(--admin-fg)", fontSize: 12 },
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.date),
      axisLine: { lineStyle: { color: "var(--admin-border)" } },
      axisLabel: { color: "var(--admin-fg-muted)", fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "var(--admin-fg-muted)", fontSize: 11 },
      splitLine: { lineStyle: { color: "var(--admin-border)", type: "dashed" } },
    },
    series: [
      {
        type: "line",
        data: data.map((d) => d.count),
        smooth: 0.4,
        symbol: "none",
        lineStyle: { color: "var(--admin-brand)", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(26,68,116,0.18)" },
              { offset: 1, color: "rgba(26,68,116,0.01)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: "12rem", width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}
