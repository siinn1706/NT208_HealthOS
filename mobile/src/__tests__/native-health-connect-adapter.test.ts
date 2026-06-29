/* eslint-env jest */
import { createHealthConnectAdapter, HealthConnectNativeUnavailableError } from '../healthconnect/native-health-connect-adapter';

type MockHealthConnectModule = {
  SdkAvailabilityStatus: {
    SDK_UNAVAILABLE: number;
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: number;
    SDK_AVAILABLE: number;
  };
  getSdkStatus: jest.Mock;
  initialize: jest.Mock;
  getGrantedPermissions: jest.Mock;
  requestPermission: jest.Mock;
  getChanges: jest.Mock;
  readRecords: jest.Mock;
};

function createNativeModule(overrides: Partial<MockHealthConnectModule> = {}): MockHealthConnectModule {
  return {
    SdkAvailabilityStatus: {
      SDK_UNAVAILABLE: 1,
      SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
      SDK_AVAILABLE: 3,
    },
    getSdkStatus: jest.fn().mockResolvedValue(3),
    initialize: jest.fn().mockResolvedValue(true),
    getGrantedPermissions: jest.fn().mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]),
    requestPermission: jest.fn().mockResolvedValue([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'HeartRate' },
    ]),
    getChanges: jest.fn().mockResolvedValue({
      upsertionChanges: [],
      deletionChanges: [],
      nextChangesToken: 'tok-next',
      changesTokenExpired: false,
      hasMore: false,
    }),
    readRecords: jest.fn().mockResolvedValue({ records: [], pageToken: undefined }),
    ...overrides,
  };
}

describe('native Health Connect adapter', () => {
  it('requests missing read permissions and returns the granted Core scopes', async () => {
    const module = createNativeModule({
      getGrantedPermissions: jest.fn()
        .mockResolvedValueOnce([{ accessType: 'read', recordType: 'Steps' }])
        .mockResolvedValueOnce([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'write', recordType: 'Weight' },
          { accessType: 'read', recordType: 'Nutrition' },
        ]),
    });
    const adapter = createHealthConnectAdapter({
      platform: 'android',
      loadModule: () => module as never,
    });

    await expect(adapter.requestPermissions!()).resolves.toEqual(['HeartRate', 'Steps']);
    expect(module.requestPermission).toHaveBeenCalledWith(expect.arrayContaining([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ExerciseSession' },
    ]));
  });

  it('getGrantedPermissions reads scopes without opening the permission prompt', async () => {
    const module = createNativeModule();
    const adapter = createHealthConnectAdapter({
      platform: 'android',
      loadModule: () => module as never,
    });

    await expect(adapter.getGrantedPermissions()).resolves.toEqual(['Steps']);
    expect(module.requestPermission).not.toHaveBeenCalled();
  });

  it('backfills first sync and stores a fresh changes token', async () => {
    const module = createNativeModule({
      getChanges: jest.fn().mockResolvedValue({
        upsertionChanges: [{
          record: {
            recordType: 'Steps',
            count: 1200,
            startTime: '2026-05-20T10:00:00.000Z',
            endTime: '2026-05-20T11:00:00.000Z',
            metadata: { id: 'steps-delta', lastModifiedTime: '2026-05-20T11:05:00.000Z' },
          },
        }],
        deletionChanges: [],
        nextChangesToken: 'tok-steps-next',
        changesTokenExpired: false,
        hasMore: false,
      }),
      readRecords: jest.fn().mockResolvedValue({
        records: [{
          count: 900,
          startTime: '2026-05-19T10:00:00.000Z',
          endTime: '2026-05-19T11:00:00.000Z',
          metadata: { id: 'steps-backfill', lastModifiedTime: '2026-05-19T11:05:00.000Z' },
        }],
      }),
    });
    const adapter = createHealthConnectAdapter({
      platform: 'android',
      loadModule: () => module as never,
      now: () => new Date('2026-05-20T12:00:00.000Z'),
      backfillDays: 7,
    });

    const result = await adapter.readChanges({
      currentTokens: { Steps: null },
      grantedPermissions: ['Steps'],
    });

    expect(module.getChanges).toHaveBeenCalledWith({ recordTypes: ['Steps'] });
    expect(module.readRecords).toHaveBeenCalledWith('Steps', expect.objectContaining({
      timeRangeFilter: {
        operator: 'between',
        startTime: '2026-05-13T12:00:00.000Z',
        endTime: '2026-05-20T12:00:00.000Z',
      },
      pageSize: 500,
    }));
    expect(result.records?.map((record) => [record.external_id, record.value])).toEqual([
      ['steps-backfill', 900],
      ['steps-delta', 1200],
    ]);
    expect(result.nextChangesTokens).toEqual({ Steps: 'tok-steps-next' });
  });

  it('keeps native module failures as controlled unavailable errors', async () => {
    const module = createNativeModule({
      getSdkStatus: jest.fn().mockRejectedValue(new Error('not linked')),
    });
    const adapter = createHealthConnectAdapter({
      platform: 'android',
      loadModule: () => module as never,
    });

    await expect(adapter.getGrantedPermissions()).rejects.toBeInstanceOf(HealthConnectNativeUnavailableError);
  });
});
