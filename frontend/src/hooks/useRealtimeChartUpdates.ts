"use client";

import { useEffect, useRef, useCallback } from "react";
import { useHealthAlerts } from "./useHealthAlerts";

interface RealtimeConfig {
  metricType: string;
  onDataPoint: (point: { date: string; value: number }) => void;
  enabled?: boolean;
}

/**
 * Subscribes to WebSocket health alerts for live metric updates.
 * When a new metric reading arrives, calls onDataPoint to update chart.
 */
export function useRealtimeChartUpdates(configs: RealtimeConfig[]) {
  const { status, lastMessage } = useHealthAlerts();
  const isConnected = status === "connected";

  const debounceRef = useRef<Map<string, number>>(new Map());

  // Fix H9 (High): Store configs in a ref so the callback always reads the latest
  // value without needing to re-create the callback on every config change.
  const configsRef = useRef(configs);
  configsRef.current = configs;

  const handleMessage = useCallback((message: unknown) => {
    const msg = message as { type?: string; metric_type?: string; value?: number; recorded_at?: string };
    if (msg.type !== "metric_update" || !msg.metric_type || msg.value === undefined) return;

    const configs = configsRef.current;
    const config = configs.find((c) => c.metricType === msg.metric_type);
    if (!config) return;

    // Debounce per metric (avoid flooding chart updates)
    const lastUpdate = debounceRef.current.get(msg.metric_type) ?? 0;
    const now = Date.now();
    if (now - lastUpdate < 5000) return; // max 1 update per 5s per metric
    debounceRef.current.set(msg.metric_type, now);

    config.onDataPoint({
      date: msg.recorded_at ?? new Date().toISOString(),
      value: msg.value,
    });
  }, []);

  useEffect(() => {
    if (!isConnected || !lastMessage) return;
    handleMessage(lastMessage);
  }, [isConnected, lastMessage, handleMessage]);

  return { isConnected };
}
