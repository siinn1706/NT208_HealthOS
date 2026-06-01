/* eslint-env jest */
import {
  mapHealthConnectDeletionToIngestDeletions,
  mapHealthConnectRecordToIngestRecords,
} from '../healthconnect/health-connect-record-mapper';

const metadata = {
  id: 'hc-record-1',
  dataOrigin: 'com.google.android.apps.fitness',
  lastModifiedTime: '2026-05-20T12:10:00.000Z',
  recordingMethod: 2,
};

describe('Health Connect record mapper', () => {
  it('maps core Health Connect records to backend metric payloads', () => {
    const records = [
      ...mapHealthConnectRecordToIngestRecords({
        recordType: 'Steps',
        count: 2400,
        startTime: '2026-05-20T10:00:00.000Z',
        endTime: '2026-05-20T11:00:00.000Z',
        metadata,
      }),
      ...mapHealthConnectRecordToIngestRecords({
        recordType: 'HeartRate',
        startTime: '2026-05-20T10:00:00.000Z',
        endTime: '2026-05-20T10:02:00.000Z',
        samples: [
          { time: '2026-05-20T10:00:00.000Z', beatsPerMinute: 70 },
          { time: '2026-05-20T10:01:00.000Z', beatsPerMinute: 80 },
        ],
        metadata: { ...metadata, id: 'hc-heart-1' },
      }),
      ...mapHealthConnectRecordToIngestRecords({
        recordType: 'Weight',
        time: '2026-05-20T09:00:00.000Z',
        weight: { inKilograms: 62.35 },
        metadata: { ...metadata, id: 'hc-weight-1', recordingMethod: 3 },
      }),
    ];

    expect(records).toEqual([
      expect.objectContaining({
        external_id: 'hc-record-1',
        metric_type: 'steps',
        value: 2400,
        unit: 'count',
        recorded_at: '2026-05-20T11:00:00.000Z',
        source: 'health_connect',
        source_app: 'com.google.android.apps.fitness',
        recording_method: 'auto',
      }),
      expect.objectContaining({
        external_id: 'hc-heart-1',
        metric_type: 'heart_rate',
        value: 75,
        unit: 'bpm',
      }),
      expect.objectContaining({
        external_id: 'hc-weight-1',
        metric_type: 'weight_kg',
        value: 62.35,
        unit: 'kg',
        recording_method: 'manual',
      }),
    ]);
  });

  it('splits blood pressure and maps durations for sleep and exercise', () => {
    const records = [
      ...mapHealthConnectRecordToIngestRecords({
        recordType: 'BloodPressure',
        time: '2026-05-20T08:00:00.000Z',
        systolic: { inMillimetersOfMercury: 118 },
        diastolic: { inMillimetersOfMercury: 76 },
        metadata: { ...metadata, id: 'bp-1' },
      }),
      ...mapHealthConnectRecordToIngestRecords({
        recordType: 'SleepSession',
        startTime: '2026-05-20T00:00:00.000Z',
        endTime: '2026-05-20T07:30:00.000Z',
        metadata: { ...metadata, id: 'sleep-1' },
      }),
      ...mapHealthConnectRecordToIngestRecords({
        recordType: 'ExerciseSession',
        startTime: '2026-05-20T12:00:00.000Z',
        endTime: '2026-05-20T12:45:00.000Z',
        metadata: { ...metadata, id: 'exercise-1' },
      }),
    ];

    expect(records.map((record) => [record.external_id, record.metric_type, record.value])).toEqual([
      ['bp-1:systolic', 'blood_pressure_systolic', 118],
      ['bp-1:diastolic', 'blood_pressure_diastolic', 76],
      ['sleep-1', 'sleep_minutes', 450],
      ['exercise-1', 'exercise_session_minutes', 45],
    ]);
  });

  it('uses fallback record type and skips values that would fail Core validation', () => {
    expect(mapHealthConnectRecordToIngestRecords({
      count: 300000,
      startTime: '2026-05-20T10:00:00.000Z',
      endTime: '2026-05-20T11:00:00.000Z',
      metadata: { id: 'too-many-steps' },
    }, 'Steps')).toEqual([]);
  });

  it('expands blood pressure deletions to both derived backend rows', () => {
    expect(mapHealthConnectDeletionToIngestDeletions('bp-1', 'BloodPressure')).toEqual([
      { external_id: 'bp-1:systolic' },
      { external_id: 'bp-1:diastolic' },
    ]);
  });

  it('keeps derived ids within the Core post-prefix database budget', () => {
    const longId = 'x'.repeat(200);
    const records = mapHealthConnectRecordToIngestRecords({
      recordType: 'BloodPressure',
      time: '2026-05-20T08:00:00.000Z',
      systolic: { inMillimetersOfMercury: 118 },
      diastolic: { inMillimetersOfMercury: 76 },
      metadata: { id: longId },
    });
    const deletion = mapHealthConnectDeletionToIngestDeletions(longId, 'BloodPressure')[1];
    const backendPrefix = `hc:${'0'.repeat(36)}:`;

    for (const item of [...records, deletion]) {
      expect(`${backendPrefix}${item.external_id}`.length).toBeLessThanOrEqual(128);
    }
    expect(`${backendPrefix}${deletion.external_id}`).toHaveLength(128);
  });
});
