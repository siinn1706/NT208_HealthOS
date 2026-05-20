/* eslint-env jest */
import { deviceService } from '../api/services/device-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('deviceService', () => {
  it('lists connected devices', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [{ id: 'dev-1', name: 'Health Connect' }] } as never);

    await expect(deviceService.list()).resolves.toEqual([{ id: 'dev-1', name: 'Health Connect' }]);
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices');
  });

  it('connects a provider', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'dev-2', provider: 'google_fit' } } as never);

    await expect(deviceService.connect({ provider: 'google_fit', device_label: 'Google Fit' })).resolves.toEqual({
      id: 'dev-2',
      provider: 'google_fit',
    });
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices', {
      method: 'POST',
      json: { provider: 'google_fit', device_label: 'Google Fit' },
    });
  });

  it('triggers device sync', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'dev-2', last_sync_status: 'pending' } } as never);

    await expect(deviceService.sync('dev-2')).resolves.toEqual({ id: 'dev-2', last_sync_status: 'pending' });
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices/dev-2/sync', {
      method: 'POST',
    });
  });

  it('disconnects a provider', async () => {
    mockApiRequest.mockResolvedValueOnce(undefined as never);

    await expect(deviceService.disconnect('dev-2')).resolves.toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices/dev-2', {
      method: 'DELETE',
    });
  });

  it('posts ingest payload with Idempotency-Key header', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { inserted: 1, updated: 0, deleted: 0, skipped: 0, errors: [] } } as never);

    await expect(
      deviceService.ingest(
        'dev/1',
        {
          provider: 'health_connect',
          records: [{ external_id: 'r1', metric_type: 'STEPS', value: 2000, unit: 'count', recorded_at: '2026-05-20T12:00:00.000Z' }],
          next_changes_tokens: { Steps: 'token-1' },
        },
        'idem-1',
      ),
    ).resolves.toEqual({ inserted: 1, updated: 0, deleted: 0, skipped: 0, errors: [] });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices/dev%2F1/ingest', {
      method: 'POST',
      json: {
        provider: 'health_connect',
        records: [{ external_id: 'r1', metric_type: 'STEPS', value: 2000, unit: 'count', recorded_at: '2026-05-20T12:00:00.000Z' }],
        next_changes_tokens: { Steps: 'token-1' },
      },
      headers: { 'Idempotency-Key': 'idem-1' },
    });
  });

  it('updates Health Connect permission scopes', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'dev-3', scopes: ['Steps', 'HeartRate'] } } as never);

    await expect(deviceService.patchPermissions('dev-3', ['Steps', 'HeartRate'])).resolves.toEqual({
      id: 'dev-3',
      scopes: ['Steps', 'HeartRate'],
    });
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices/dev-3/permissions', {
      method: 'PATCH',
      json: { scopes: ['Steps', 'HeartRate'] },
    });
  });

  it('loads sync-state cursors', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: [
        {
          record_type: 'Steps',
          changes_token: 'tok-1',
          last_synced_at: '2026-05-20T12:00:00.000Z',
          last_attempted_at: null,
          consecutive_failures: 0,
        },
      ],
    } as never);

    await expect(deviceService.getSyncState('dev-4')).resolves.toEqual([
      {
        record_type: 'Steps',
        changes_token: 'tok-1',
        last_synced_at: '2026-05-20T12:00:00.000Z',
        last_attempted_at: null,
        consecutive_failures: 0,
      },
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices/dev-4/sync-state');
  });

  it('updates sync-state cursors', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: [
        {
          record_type: 'Steps',
          changes_token: null,
          last_synced_at: null,
          last_attempted_at: null,
          consecutive_failures: 0,
        },
      ],
    } as never);

    await expect(deviceService.putSyncState('dev-4', { Steps: null })).resolves.toEqual([
      {
        record_type: 'Steps',
        changes_token: null,
        last_synced_at: null,
        last_attempted_at: null,
        consecutive_failures: 0,
      },
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/devices/dev-4/sync-state', {
      method: 'PUT',
      json: { tokens: { Steps: null } },
    });
  });
});
