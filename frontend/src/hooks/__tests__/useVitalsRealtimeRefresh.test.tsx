import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useVitalsRealtimeRefresh,
  VITALS_REALTIME_EVENT,
  VITALS_REALTIME_RECONNECT_EVENT,
} from "../useVitalsRealtimeRefresh";

function dispatchVitalsFrame(event: string, payload: Record<string, unknown> = {}) {
  window.dispatchEvent(
    new CustomEvent(VITALS_REALTIME_EVENT, {
      detail: { event, payload },
    }),
  );
}

function dispatchReconnect() {
  window.dispatchEvent(new CustomEvent(VITALS_REALTIME_RECONNECT_EVENT));
}

describe("useVitalsRealtimeRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("ignores non-vitals websocket frames", () => {
    const onRefresh = vi.fn();
    renderHook(() => useVitalsRealtimeRefresh({ onRefresh, debounceMs: 500 }));

    for (const event of ["ping", "server:hello", "health_alert", "chat.message"]) {
      act(() => {
        dispatchVitalsFrame(event);
        vi.advanceTimersByTime(750);
      });
    }

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("debounces vitals refresh bursts", () => {
    const onRefresh = vi.fn();
    renderHook(() => useVitalsRealtimeRefresh({ onRefresh, debounceMs: 500 }));

    act(() => {
      dispatchVitalsFrame("vitals.updated", { source: "health_connect", count: 1 });
      vi.advanceTimersByTime(250);
      dispatchVitalsFrame("vitals.updated", { source: "health_connect", count: 2 });
      vi.advanceTimersByTime(499);
    });

    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps a scheduled refresh when unrelated frames arrive", () => {
    const onRefresh = vi.fn();
    renderHook(() => useVitalsRealtimeRefresh({ onRefresh, debounceMs: 500 }));

    act(() => {
      dispatchVitalsFrame("vitals.updated", { source: "health_connect", count: 1 });
      vi.advanceTimersByTime(250);
      dispatchVitalsFrame("health_alert", { id: "alert-1" });
      vi.advanceTimersByTime(250);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes on websocket reconnect", () => {
    const onRefresh = vi.fn();
    renderHook(() => useVitalsRealtimeRefresh({ onRefresh }));

    act(() => {
      dispatchReconnect();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not replay a stale vitals frame after reconnect", () => {
    const onRefresh = vi.fn();
    renderHook(() => useVitalsRealtimeRefresh({ onRefresh, debounceMs: 500 }));

    act(() => {
      dispatchVitalsFrame("vitals.updated", { source: "health_connect", count: 1 });
      vi.advanceTimersByTime(500);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      dispatchReconnect();
      vi.advanceTimersByTime(500);
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("cleans up a pending event timer on unmount", () => {
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() =>
      useVitalsRealtimeRefresh({ onRefresh, debounceMs: 500 }),
    );

    act(() => {
      dispatchVitalsFrame("vitals.updated", { source: "health_connect", count: 1 });
      unmount();
      vi.advanceTimersByTime(500);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("does not open an additional websocket consumer", () => {
    const source = useVitalsRealtimeRefresh.toString();

    expect(source).not.toContain("useHealthAlerts");
    expect(source).not.toContain("useChatWs");
  });
});
