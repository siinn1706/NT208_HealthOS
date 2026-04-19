/**
 * Locks in that `<ToastProvider>` exposes a stable context value, so
 * showing a toast doesn't cascade a re-render through every screen
 * that calls `useToast()`.
 *
 * Before the memoization fix, `value` was a fresh object on every
 * render and the `success` / `error` / `info` helpers were fresh
 * arrow-function closures — `setToasts` (called by `show`) would
 * trigger a Provider re-render, which would invalidate every
 * `useToast()` consumer because the context value identity changed.
 */
import React, { useEffect, useRef } from "react";
import { Text } from "react-native";
import { render, act } from "@testing-library/react-native";

import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ThemeProvider } from "@/theme";

function withProviders(node: React.ReactElement) {
  return (
    <ThemeProvider initialMode="light">
      <ToastProvider>{node}</ToastProvider>
    </ThemeProvider>
  );
}

describe("ToastProvider value stability", () => {
  it("exposes the same context-value reference across re-renders of the consumer", () => {
    const seenValues: ReturnType<typeof useToast>[] = [];

    function Consumer({ counter }: { counter: number }) {
      const value = useToast();
      seenValues.push(value);
      return <Text>{counter}</Text>;
    }

    const { rerender } = render(withProviders(<Consumer counter={0} />));
    rerender(withProviders(<Consumer counter={1} />));
    rerender(withProviders(<Consumer counter={2} />));

    // Three renders, three captures. All MUST share the same reference
    // — otherwise toast.success(...) anywhere in the tree would
    // invalidate every screen.
    expect(seenValues).toHaveLength(3);
    expect(seenValues[0]).toBe(seenValues[1]);
    expect(seenValues[1]).toBe(seenValues[2]);
  });

  it("does not re-invoke effects that depend on the toast handle when other state changes", () => {
    let effectRuns = 0;

    function Consumer({ counter }: { counter: number }) {
      const toast = useToast();
      const ref = useRef(toast);
      useEffect(() => {
        // Dep is the toast handle; if the handle is stable across
        // unrelated re-renders, the effect runs exactly once.
        ref.current = toast;
        effectRuns += 1;
      }, [toast]);
      return <Text>{counter}</Text>;
    }

    const { rerender } = render(withProviders(<Consumer counter={0} />));
    rerender(withProviders(<Consumer counter={1} />));
    rerender(withProviders(<Consumer counter={2} />));

    expect(effectRuns).toBe(1);
  });

  it("keeps the value stable while toasts are being shown and dismissed", () => {
    // Fake timers throughout so the auto-dismiss setTimeout doesn't
    // leak past the test boundary and Jest doesn't print
    // "asynchronous operations that weren't stopped".
    jest.useFakeTimers();
    try {
      let captured: ReturnType<typeof useToast> | null = null;

      function Consumer() {
        const toast = useToast();
        captured = toast;
        return <Text>x</Text>;
      }

      render(withProviders(<Consumer />));
      const initial = captured!;
      expect(initial).toBeDefined();

      // Trigger a toast — Provider's setToasts will fire and re-render
      // the Provider. The consumer re-renders too (because the Provider
      // re-rendered), but the context VALUE reference must remain stable.
      act(() => {
        initial.success("hi");
      });
      expect(captured).toBe(initial);

      // Drain the dismiss timer (4 s in the impl). Same expectation.
      act(() => {
        initial.info("queued");
      });
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(captured).toBe(initial);
    } finally {
      jest.useRealTimers();
    }
  });
});
