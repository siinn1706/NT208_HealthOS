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
});
