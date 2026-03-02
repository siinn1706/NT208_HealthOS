"use client";

import { EChartWrapper } from "./EChartWrapper";
import type { EChartsOption } from "echarts";

interface KpiDonutChartProps {
  value: number;      // current value
  target: number;     // max value for 100%
  color: string;      // ring fill color
  size?: number;      // px size (square)
}

export function KpiDonutChart({
  value,
  target,
  color,
  size = 90,
}: KpiDonutChartProps) {
  const pct = Math.min(Math.round((value / target) * 100), 100);

  const option: EChartsOption = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 90,
        endAngle: -270,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: { color },
        },
        axisLine: {
          lineStyle: {
            width: 8,
            color: [[1, "rgba(148,163,184,0.15)"]],
          },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value: pct, name: "" }],
        detail: {
          show: true,
          offsetCenter: [0, 0],
          formatter: `{a|${pct}%}`,
          rich: {
            a: {
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-foreground)",
            },
          },
        },
        radius: "92%",
      },
    ],
  };

  return (
    <EChartWrapper
      option={option}
      height={size}
      className="flex items-center justify-center"
    />
  );
}
