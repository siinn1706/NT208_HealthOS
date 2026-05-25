"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

interface PlanSlice {
  name: string;
  value: number;
  color?: string;
}

interface PlanDistributionDonutProps {
  data: PlanSlice[] | null | undefined;
  isLoading?: boolean;
}

const DEFAULT_COLORS = [
  "var(--admin-plan-free)",
  "var(--admin-plan-basic)",
  "var(--admin-plan-pro)",
  "var(--admin-plan-enterprise)",
];

/** Plan distribution donut chart using echarts-for-react. */
export function PlanDistributionDonut({ data, isLoading }: PlanDistributionDonutProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  const isEmpty = !data || data.length === 0 || data.every((d) => d.value === 0);

  if (isEmpty) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
        <p className="text-sm text-[var(--admin-fg-subtle)]">No subscription data</p>
      </div>
    );
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "var(--admin-surface-raised)",
      borderColor: "var(--admin-border)",
      textStyle: { color: "var(--admin-fg)", fontSize: 12 },
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: "4%",
      top: "center",
      textStyle: { color: "var(--admin-fg-muted)", fontSize: 12 },
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["38%", "50%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: false } },
        data: data!.map((slice, i) => ({
          name: slice.name,
          value: slice.value,
          itemStyle: { color: slice.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] },
        })),
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
