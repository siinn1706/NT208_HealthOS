/* eslint-env jest */
import { renderHook, act } from '@testing-library/react-native';

jest.mock('../healthconnect/orchestrator', () => ({
  syncHealthConnect: jest.fn(),
  resetHealthConnectSyncState: jest.fn(),
}));

import { useHealthConnectSync } from '../healthconnect/use-health-connect-sync';
import { syncHealthConnect, resetHealthConnectSyncState } from '../healthconnect/orchestrator';

const mockSyncHealthConnect = syncHealthConnect as jest.MockedFunction<typeof syncHealthConnect>;
const mockReset = resetHealthConnectSyncState as jest.MockedFunction<typeof resetHealthConnectSyncState>;

const mockAdapter = {} as any;

describe('useHealthConnectSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial idle state', () => {
    const { result } = renderHook(() => useHealthConnectSync(mockAdapter));
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastResult).toBeNull();
  });

  it('sync() sets isSyncing then clears it on success', async () => {
    const fakeResult = { synced: 5 } as any;
    mockSyncHealthConnect.mockResolvedValueOnce(fakeResult);

    const { result } = renderHook(() => useHealthConnectSync(mockAdapter));

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.lastResult).toBe(fakeResult);
    expect(result.current.error).toBeNull();
  });

  it('sync() sets error and rethrows on failure', async () => {
    const err = new Error('sync failed');
    mockSyncHealthConnect.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useHealthConnectSync(mockAdapter));

    await act(async () => {
      await expect(result.current.sync()).rejects.toThrow('sync failed');
    });

    expect(result.current.error).toBe(err);
    expect(result.current.isSyncing).toBe(false);
  });

  it('sync() normalizes non-Error rejections', async () => {
    mockSyncHealthConnect.mockRejectedValueOnce('string error');

    const { result } = renderHook(() => useHealthConnectSync(mockAdapter));

    await act(async () => {
      await expect(result.current.sync()).rejects.toBeInstanceOf(Error);
    });

    expect(result.current.error?.message).toBe('Health Connect sync failed.');
  });

  it('reset() resolves and clears isSyncing', async () => {
    const fakeResetResult = { cleared: 3 } as any;
    mockReset.mockResolvedValueOnce(fakeResetResult);

    const { result } = renderHook(() => useHealthConnectSync(mockAdapter));

    await act(async () => {
      const r = await result.current.reset();
      expect(r).toBe(fakeResetResult);
    });

    expect(result.current.isSyncing).toBe(false);
  });

  it('reset() sets error and rethrows on failure', async () => {
    mockReset.mockRejectedValueOnce(new Error('reset failed'));

    const { result } = renderHook(() => useHealthConnectSync(mockAdapter));

    await act(async () => {
      await expect(result.current.reset()).rejects.toThrow('reset failed');
    });

    expect(result.current.error?.message).toBe('reset failed');
  });
});
