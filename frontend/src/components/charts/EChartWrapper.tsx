"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
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
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);

    useImperativeHandle(ref, () => ({
      getInstance: () => chartRef.current ?? undefined,
      resize: () => chartRef.current?.resize(),
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });
      chartRef.current = chart;
      chart.setOption(option);

      const resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        chart.dispose();
        chartRef.current = null;
      };
    }, []); // mount only

    useEffect(() => {
      chartRef.current?.setOption(option);
    }, [option]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ height }}
      >
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge
          lazyUpdate
          opts={{ renderer: "canvas" }}
          {...rest}
        />
      </div>
    );
  }
);
