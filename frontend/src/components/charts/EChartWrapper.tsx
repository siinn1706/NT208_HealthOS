"use client";

/**
 * EChartWrapper — dynamic import with ssr:false.
 * All chart components in this project must use this wrapper
 * instead of importing echarts-for-react directly.
 * This prevents SSR hydration errors.
 */
import dynamic from "next/dynamic";
import type { EChartsOption, EChartsReactProps } from "echarts-for-react";

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

export interface EChartWrapperProps extends Omit<EChartsReactProps, "option"> {
  option: EChartsOption;
  height?: number | string;
  className?: string;
}

export function EChartWrapper({
  option,
  height = 280,
  className,
  ...rest
}: EChartWrapperProps) {
  return (
    <div className={className} style={{ height }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge
        lazyUpdate
        opts={{ renderer: "svg" }}
        {...rest}
      />
    </div>
  );
}
