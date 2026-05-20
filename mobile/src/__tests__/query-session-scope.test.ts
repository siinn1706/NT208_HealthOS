import { renderHook, waitFor } from '@testing-library/react-native';
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
});
