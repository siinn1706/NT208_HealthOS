/* eslint-env jest */
import {
  buildHealthIngestBatches,
  resetHealthConnectSyncState,
  syncHealthConnect,
  type HealthConnectSyncAdapter,
} from '../healthconnect/orchestrator';
import { deviceService } from '../api/services/device-service';

jest.mock('../api/services/device-service', () => ({
  deviceService: {
    list: jest.fn(),
    connect: jest.fn(),
    sync: jest.fn(),
    disconnect: jest.fn(),
    ingest: jest.fn(),
    getSyncState: jest.fn(),
    putSyncState: jest.fn(),
    patchPermissions: jest.fn(),
  },
}));

const mockedDeviceService = deviceService as jest.Mocked<typeof deviceService>;

const baseDevice = {
  id: 'dev-hc-1',
  provider: 'health_connect',
  name: 'Health Connect',
  model: null,
  connected: true,
  last_sync: null,
  battery_pct: null,
  device_label: 'Health Connect',
  external_account_id: null,
  scopes: ['Steps'],
  last_sync_status: null,
  last_sync_error: null,
  last_sync_count: null,
  last_attempted_at: null,
};

const baseSyncStateRow = {
  record_type: 'Steps',
  changes_token: 'tok-1',
  last_synced_at: null,
  last_attempted_at: null,
  consecutive_failures: 0,
};

const baseAdapter: HealthConnectSyncAdapter = {
  getGrantedPermissions: async () => ['Steps'],
  readChanges: async () => ({
    records: [],
    deletions: [],
  }),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedDeviceService.list.mockResolvedValue([baseDevice]);
  mockedDeviceService.connect.mockResolvedValue(baseDevice as never);
  mockedDeviceService.getSyncState.mockResolvedValue([baseSyncStateRow]);
  mockedDeviceService.putSyncState.mockResolvedValue([baseSyncStateRow] as never);
  mockedDeviceService.patchPermissions.mockResolvedValue(baseDevice as never);
  mockedDeviceService.ingest.mockResolvedValue({
    inserted: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
  } as never);
});

describe('healthconnect orchestrator', () => {
  it('omits null/empty nextChangesTokens from ingest and routes resets to PUT sync-state', async () => {
    const adapter: HealthConnectSyncAdapter = {
      ...baseAdapter,
      readChanges: async () => ({
        records: [{
          external_id: 'r-1',
          metric_type: 'STEPS',
          value: 1200,
          unit: 'count',
          recorded_at: '2026-05-20T12:00:00.000Z',
        }],
        nextChangesTokens: {
          Steps: null,
          HeartRate: '   ',
          SleepSession: undefined,
        },
      }),
    };

    await syncHealthConnect(adapter);

    expect(mockedDeviceService.ingest).toHaveBeenCalledTimes(1);
    const ingestBody = mockedDeviceService.ingest.mock.calls[0][1];
    expect(ingestBody.next_changes_tokens).toBeUndefined();
    expect(mockedDeviceService.putSyncState).toHaveBeenCalledWith('dev-hc-1', { Steps: null, HeartRate: null });
  });

  it('chunks 501 records into multiple ingest calls', async () => {
    const records = Array.from({ length: 501 }, (_, index) => ({
      external_id: `r-${index}`,
      metric_type: 'STEPS',
      value: 100 + index,
      unit: 'count',
      recorded_at: '2026-05-20T12:00:00.000Z',
    }));
    const adapter: HealthConnectSyncAdapter = {
      ...baseAdapter,
      readChanges: async () => ({ records }),
    };

    await syncHealthConnect(adapter);

    expect(mockedDeviceService.ingest).toHaveBeenCalledTimes(2);
    expect(mockedDeviceService.ingest.mock.calls[0][1].records?.length).toBe(500);
    expect(mockedDeviceService.ingest.mock.calls[1][1].records?.length).toBe(1);
  });

  it('splits batches when payload would exceed 256 KiB', () => {
    const longText = 'x'.repeat(190_000);
    const records = [
      {
        external_id: 'r-1',
        metric_type: 'STEPS',
        value: 1,
        unit: 'count',
        recorded_at: '2026-05-20T12:00:00.000Z',
        source_app: longText,
      },
      {
        external_id: 'r-2',
        metric_type: 'STEPS',
        value: 2,
        unit: 'count',
        recorded_at: '2026-05-20T12:00:00.000Z',
        source_app: longText,
      },
    ];

    const batches = buildHealthIngestBatches({
      records,
      deletions: [],
      nextChangesTokens: {},
    });

    expect(batches.length).toBe(2);
    expect(batches[0].records?.length).toBe(1);
    expect(batches[1].records?.length).toBe(1);
  });

  it('retries ingest with the same idempotency key', async () => {
    const adapter: HealthConnectSyncAdapter = {
      ...baseAdapter,
      readChanges: async () => ({
        records: [{
          external_id: 'r-1',
          metric_type: 'STEPS',
          value: 333,
          unit: 'count',
          recorded_at: '2026-05-20T12:00:00.000Z',
        }],
        nextChangesTokens: { Steps: 'tok-2' },
      }),
    };

    mockedDeviceService.ingest
      .mockRejectedValueOnce(new Error('transient failure') as never)
      .mockResolvedValueOnce({
        inserted: 1,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: [],
      } as never);

    await syncHealthConnect(adapter);

    expect(mockedDeviceService.ingest).toHaveBeenCalledTimes(2);
    const firstKey = mockedDeviceService.ingest.mock.calls[0][2];
    const secondKey = mockedDeviceService.ingest.mock.calls[1][2];
    expect(firstKey).toBe(secondKey);
  });

  it('uses PUT sync-state for explicit reset and never calls ingest', async () => {
    mockedDeviceService.getSyncState.mockResolvedValue([
      baseSyncStateRow,
      { ...baseSyncStateRow, record_type: 'HeartRate', changes_token: 'tok-2' },
    ]);

    await resetHealthConnectSyncState({ deviceId: 'dev-hc-1' });

    expect(mockedDeviceService.putSyncState).toHaveBeenCalledWith('dev-hc-1', {
      Steps: null,
      HeartRate: null,
    });
    expect(mockedDeviceService.ingest).not.toHaveBeenCalled();
  });

  it('patches permissions when granted scopes changed', async () => {
    const adapter: HealthConnectSyncAdapter = {
      ...baseAdapter,
      getGrantedPermissions: async () => ['HeartRate', 'Steps'],
    };

    await syncHealthConnect(adapter);

    expect(mockedDeviceService.patchPermissions).toHaveBeenCalledWith('dev-hc-1', ['HeartRate', 'Steps']);
  });
});
