"use client";

import { useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption, EChartsReactProps } from "echarts-for-react";
import * as echarts from "echarts";

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
          option={option}
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
