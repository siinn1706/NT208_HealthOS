/* eslint-env jest */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { invalidateApiQuery, setApiSessionScope, useApiQuery } from '../api/query';

beforeEach(() => {
  setApiSessionScope(null);
  invalidateApiQuery();
});

describe('session scoped api query cache', () => {
  it('does not reuse account A cache for account B', async () => {
    const queryA = jest.fn().mockResolvedValue({ owner: 'A' });
    setApiSessionScope('user-a');
    const hookA = renderHook(() => useApiQuery('dashboard:summary', queryA));
    await waitFor(() => expect(hookA.result.current.data).toEqual({ owner: 'A' }));
    hookA.unmount();

    const queryB = jest.fn().mockResolvedValue({ owner: 'B' });
    setApiSessionScope('user-b');
    const hookB = renderHook(() => useApiQuery('dashboard:summary', queryB));
    await waitFor(() => expect(hookB.result.current.data).toEqual({ owner: 'B' }));

    expect(queryA).toHaveBeenCalledTimes(1);
    expect(queryB).toHaveBeenCalledTimes(1);
  });

  it('clears cache on session invalidation', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ status: 'first-user' })
      .mockResolvedValueOnce({ status: 'after-clear' });

    setApiSessionScope('user-a');
    const first = renderHook(() => useApiQuery('me', query));
    await waitFor(() => expect(first.result.current.data).toEqual({ status: 'first-user' }));
    first.unmount();

    invalidateApiQuery();
    setApiSessionScope(null);
    const second = renderHook(() => useApiQuery('me', query));
    await waitFor(() => expect(second.result.current.data).toEqual({ status: 'after-clear' }));
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('hydrates all callers from cache when multiple hooks join one in-flight request', async () => {
    let resolveRequest: ((value: { owner: string }) => void) | null = null;
    const pending = new Promise<{ owner: string }>((resolve) => {
      resolveRequest = resolve;
    });
    const query = jest.fn(() => pending);

    setApiSessionScope('user-a');
    const first = renderHook(() => useApiQuery('dashboard:summary', query));
    const second = renderHook(() => useApiQuery('dashboard:summary', query));

    expect(query).toHaveBeenCalledTimes(1);
    act(() => {
      resolveRequest?.({ owner: 'A' });
    });

    await waitFor(() => expect(first.result.current.data).toEqual({ owner: 'A' }));
    await waitFor(() => expect(second.result.current.data).toEqual({ owner: 'A' }));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(first.result.current.error).toBeNull();
    expect(second.result.current.error).toBeNull();
  });

  it('propagates shared request errors and clears loading for all joined callers', async () => {
    let rejectRequest: ((reason?: unknown) => void) | null = null;
    const pending = new Promise<{ owner: string }>((_resolve, reject) => {
      rejectRequest = reject;
    });
    const query = jest.fn(() => pending);

    setApiSessionScope('user-a');
    const first = renderHook(() => useApiQuery('dashboard:summary', query));
    const second = renderHook(() => useApiQuery('dashboard:summary', query));

    expect(query).toHaveBeenCalledTimes(1);
    act(() => {
      rejectRequest?.(new Error('boom'));
    });

    await waitFor(() => expect(first.result.current.error?.message).toBe('boom'));
    await waitFor(() => expect(second.result.current.error?.message).toBe('boom'));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
  });

  it('reloads mounted matching queries when invalidated', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce(['old-med'])
      .mockResolvedValueOnce(['fresh-med']);

    const hook = renderHook(() => useApiQuery('medications.list', query));
    await waitFor(() => expect(hook.result.current.data).toEqual(['old-med']));

    act(() => {
      invalidateApiQuery('medications.');
    });

    await waitFor(() => expect(hook.result.current.data).toEqual(['fresh-med']));
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('does not reload mounted queries for unrelated invalidation prefixes', async () => {
    const query = jest.fn().mockResolvedValue(['med']);

    const hook = renderHook(() => useApiQuery('medications.list', query));
    await waitFor(() => expect(hook.result.current.data).toEqual(['med']));

    act(() => {
      invalidateApiQuery('appointments.');
    });

    await waitFor(() => expect(hook.result.current.isRefreshing).toBe(false));
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not reload mounted queries for session-wide invalidation', async () => {
    const query = jest.fn().mockResolvedValue(['session-data']);

    const hook = renderHook(() => useApiQuery('medications.list', query));
    await waitFor(() => expect(hook.result.current.data).toEqual(['session-data']));

    act(() => {
      invalidateApiQuery();
    });

    await waitFor(() => expect(hook.result.current.isRefreshing).toBe(false));
    expect(query).toHaveBeenCalledTimes(1);
  });
});
