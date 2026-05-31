import { renderHook, act } from '@testing-library/react-native';
import { useApiQuery, invalidateApiQuery } from '../src/api/query';

beforeEach(() => {
  invalidateApiQuery(); // clear cache between tests
});

describe('useApiQuery stability', () => {
  it('calls queryFn exactly once even when parent re-renders pass fresh inline arrows', async () => {
    const spy = jest.fn().mockResolvedValue([1, 2, 3]);

    // Initial render with inline arrow — should fire once
    const { result, rerender } = renderHook(
      ({ n }: { n: number }) =>
        useApiQuery(`stable-${n}`, () => spy(n)),
      { initialProps: { n: 0 } },
    );

    // Drain microtasks
    await act(async () => { await Promise.resolve(); });

    expect(spy).toHaveBeenCalledTimes(1);

    // Force 5 re-renders without changing the key — inline arrow is fresh each time
    for (let i = 0; i < 5; i++) {
      rerender({ n: 0 });
      await act(async () => { await Promise.resolve(); });
    }

    // Should still be 1 because ref-based capture + scopedKey unchanged
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([1, 2, 3]);
  });

  it('re-fetches when the query key changes', async () => {
    const spy = jest.fn().mockResolvedValue('data');

    const { rerender } = renderHook(
      ({ key }: { key: string }) =>
        useApiQuery(key, () => spy(key)),
      { initialProps: { key: 'key-a' } },
    );

    await act(async () => { await Promise.resolve(); });
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ key: 'key-b' });
    await act(async () => { return Promise.resolve(); });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not cache a stale in-flight result after invalidation', async () => {
    let resolveStale: (value: string) => void = () => {};
    const stalePromise = new Promise<string>((resolve) => {
      resolveStale = resolve;
    });
    const slowRead = jest.fn(() => stalePromise);

    const first = renderHook(() => useApiQuery('race.meals', slowRead));

    await act(async () => { await Promise.resolve(); });
    expect(slowRead).toHaveBeenCalledTimes(1);

    act(() => {
      invalidateApiQuery('race.');
    });

    await act(async () => {
      resolveStale('stale');
      await stalePromise;
      await Promise.resolve();
    });

    expect(first.result.current.data).toBeNull();
    expect(first.result.current.isLoading).toBe(false);
    expect(first.result.current.isRefreshing).toBe(false);

    const freshRead = jest.fn().mockResolvedValue('fresh');
    const second = renderHook(() => useApiQuery('race.meals', freshRead));

    await act(async () => { await Promise.resolve(); });

    expect(freshRead).toHaveBeenCalledTimes(1);
    expect(second.result.current.data).toBe('fresh');
  });

  it('does not let a stale in-flight cleanup delete a newer request', async () => {
    let resolveStale: (value: string) => void = () => {};
    const stalePromise = new Promise<string>((resolve) => {
      resolveStale = resolve;
    });
    const staleRead = jest.fn(() => stalePromise);

    renderHook(() => useApiQuery('race.replace', staleRead));
    await act(async () => { await Promise.resolve(); });

    act(() => {
      invalidateApiQuery('race.');
    });

    let resolveFresh: (value: string) => void = () => {};
    const freshPromise = new Promise<string>((resolve) => {
      resolveFresh = resolve;
    });
    const freshRead = jest.fn(() => freshPromise);
    const second = renderHook(() => useApiQuery('race.replace', freshRead));

    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      resolveStale('stale');
      await stalePromise;
      await Promise.resolve();
    });

    const third = renderHook(() => useApiQuery('race.replace', freshRead));
    await act(async () => { await Promise.resolve(); });

    expect(freshRead).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFresh('fresh');
      await freshPromise;
      await Promise.resolve();
    });

    expect(second.result.current.data).toBe('fresh');
    expect(third.result.current.data).toBe('fresh');
  });

  it('clears loading for shared in-flight joiners after invalidation', async () => {
    let resolveStale: (value: string) => void = () => {};
    const stalePromise = new Promise<string>((resolve) => {
      resolveStale = resolve;
    });
    const sharedRead = jest.fn(() => stalePromise);

    const first = renderHook(() => useApiQuery('race.shared', sharedRead));
    await act(async () => { await Promise.resolve(); });
    const second = renderHook(() => useApiQuery('race.shared', sharedRead));
    await act(async () => { await Promise.resolve(); });

    expect(sharedRead).toHaveBeenCalledTimes(1);
    expect(first.result.current.isLoading).toBe(true);
    expect(second.result.current.isLoading).toBe(true);

    act(() => {
      invalidateApiQuery('race.');
    });

    await act(async () => {
      resolveStale('stale');
      await stalePromise;
      await Promise.resolve();
    });

    expect(first.result.current.data).toBeNull();
    expect(second.result.current.data).toBeNull();
    expect(first.result.current.isLoading).toBe(false);
    expect(second.result.current.isLoading).toBe(false);
    expect(first.result.current.isRefreshing).toBe(false);
    expect(second.result.current.isRefreshing).toBe(false);
  });
});
