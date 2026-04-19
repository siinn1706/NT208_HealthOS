import { useEffect, useRef, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay = 400
) {
  let handle: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delay);
  };
}

export function useThrottle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay = 1000
) {
  const lastRun = useRef(0);
  return (...args: TArgs) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      fn(...args);
    }
  };
}
