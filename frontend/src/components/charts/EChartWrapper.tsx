"use client";

import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { EChartsOption, EChartsReactProps } from "echarts-for-react";
import * as echarts from "echarts";

function resolveCssVar(value: string): string {
  if (typeof window === "undefined") return value;
  const match = value.match(/^var\((--[^,)]+)(?:,\s*(.+))?\)$/);
  if (!match) return value;
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  return resolved || match[2] || value;
}

// Recursively resolve CSS variable strings in an ECharts option object.
// ECharts renders on <canvas> which does not resolve CSS custom properties.
 
function resolveChartColors(obj: unknown): unknown {
  if (typeof obj === "string" && obj.startsWith("var(")) return resolveCssVar(obj);
  if (Array.isArray(obj)) return obj.map(resolveChartColors);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, resolveChartColors(v)])
    );
  }
  return obj;
}

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full animate-pulse rounded-lg bg-muted"
      style={{ height: "inherit", minHeight: 200 }}
      aria-label="Loading chart"
    />
  ),
});

export interface EChartWrapperRef {
  getInstance: () => echarts.ECharts | undefined;
  resize: () => void;
}

export interface EChartWrapperProps extends Omit<EChartsReactProps, "option"> {
  option: EChartsOption;
  height?: number | string;
  className?: string;
}

export const EChartWrapper = forwardRef<EChartWrapperRef, EChartWrapperProps>(
  function EChartWrapper({ option, height = 280, className, ...rest }, ref) {
    const chartRef = useRef<echarts.ECharts | null>(null);
    const { resolvedTheme } = useTheme();

    // Re-resolve CSS variables on every theme change (canvas does not process CSS vars)
     
    const resolvedOption = useMemo(
      () => resolveChartColors(option) as EChartsOption,
      [option, resolvedTheme]
    );

    const onChartReady = useCallback((chart: echarts.ECharts) => {
      chartRef.current = chart;
    }, []);

    useImperativeHandle(ref, () => ({
      getInstance: () => chartRef.current ?? undefined,
      resize: () => chartRef.current?.resize(),
    }));

    return (
      <div className={className} style={{ height }}>
        <ReactECharts
          option={resolvedOption}
          style={{ height: "100%", width: "100%" }}
          onChartReady={onChartReady}
          notMerge
          lazyUpdate
          opts={{ renderer: "canvas" }}
          {...rest}
        />
      </div>
    );
  }
);
