/**
 * Pure unit tests for the Health Connect → HealthOS mapper. No SDK or
 * network dependency — we just hand-craft the HC record envelopes.
 */
import "../__setup__/env-fixture";

import { mapRecord, deletionTombstone } from "@/healthconnect/mapper";
import type { HCRecord } from "@/healthconnect/types";

const META = {
  id: "hc-rec-1",
  clientRecordVersion: 1,
  lastModifiedTime: "2026-04-19T12:00:00Z",
  recordingMethod: 2,
  dataOrigin: { packageName: "com.sec.android.app.shealth" },
};

describe("mapRecord — Steps", () => {
  it("maps StepsRecord to a single steps row at endTime", () => {
    const record: HCRecord = {
      recordType: "Steps",
      metadata: META,
      startTime: "2026-04-19T11:00:00Z",
      endTime: "2026-04-19T12:00:00Z",
      count: 1234,
    };
    const out = mapRecord(record);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      external_id: "hc-rec-1",
      external_version: 1,
      metric_type: "steps",
      value: 1234,
      unit: "steps",
      recorded_at: "2026-04-19T12:00:00Z",
      source: "health_connect",
      source_app: "com.sec.android.app.shealth",
      recording_method: "automatic",
    });
  });

  it("returns empty when count is missing", () => {
    expect(
      mapRecord({
        recordType: "Steps",
        metadata: META,
        endTime: "2026-04-19T12:00:00Z",
      })
    ).toEqual([]);
  });

  it("falls back to lastModifiedTime when clientRecordVersion is absent", () => {
    const record: HCRecord = {
      recordType: "Steps",
      metadata: {
        id: "hc-2",
        lastModifiedTime: "2026-04-19T12:00:00Z",
        // clientRecordVersion intentionally omitted
      },
      endTime: "2026-04-19T12:00:00Z",
      count: 100,
    };
    const out = mapRecord(record);
    // Date.parse(2026-04-19T12:00:00Z) === 1776556800000
    expect(out[0]?.external_version).toBe(Date.parse("2026-04-19T12:00:00Z"));
  });
});

describe("mapRecord — HeartRate", () => {
  it("averages all samples and uses the midpoint timestamp", () => {
    const record: HCRecord = {
      recordType: "HeartRate",
      metadata: META,
      startTime: "2026-04-19T12:00:00Z",
      endTime: "2026-04-19T12:01:00Z",
      samples: [
        { time: "2026-04-19T12:00:10Z", beatsPerMinute: 60 },
        { time: "2026-04-19T12:00:20Z", beatsPerMinute: 70 },
        { time: "2026-04-19T12:00:30Z", beatsPerMinute: 80 },
      ],
    };
    const out = mapRecord(record);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      metric_type: "heart_rate",
      value: 70, // (60+70+80)/3
      unit: "bpm",
      recorded_at: "2026-04-19T12:00:20Z",
    });
  });

  it("returns empty when there are no samples", () => {
    expect(
      mapRecord({
        recordType: "HeartRate",
        metadata: META,
        samples: [],
      })
    ).toEqual([]);
  });
});

describe("mapRecord — SleepSession", () => {
  it("computes minute duration from startTime/endTime", () => {
    const record: HCRecord = {
      recordType: "SleepSession",
      metadata: META,
      startTime: "2026-04-19T22:00:00Z",
      endTime: "2026-04-20T06:30:00Z",
    };
    const out = mapRecord(record);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      metric_type: "sleep_minutes",
      value: 8 * 60 + 30,
      unit: "min",
      recorded_at: "2026-04-20T06:30:00Z",
    });
  });

  it("returns empty when end <= start", () => {
    expect(
      mapRecord({
        recordType: "SleepSession",
        metadata: META,
        startTime: "2026-04-19T08:00:00Z",
        endTime: "2026-04-19T07:00:00Z",
      })
    ).toEqual([]);
  });
});

describe("mapRecord — Weight", () => {
  it("maps inKilograms to weight_kg with two-decimal rounding", () => {
    const record: HCRecord = {
      recordType: "Weight",
      metadata: META,
      time: "2026-04-19T08:00:00Z",
      weight: { inKilograms: 72.345 },
    };
    const out = mapRecord(record);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      metric_type: "weight_kg",
      value: 72.35,
      unit: "kg",
      recorded_at: "2026-04-19T08:00:00Z",
    });
  });

  it("falls back to weight.value when inKilograms is missing", () => {
    const record: HCRecord = {
      recordType: "Weight",
      metadata: META,
      time: "2026-04-19T08:00:00Z",
      weight: { value: 65 },
    };
    expect(mapRecord(record)[0]?.value).toBe(65);
  });
});

describe("mapRecord — BloodPressure (stretch)", () => {
  it("emits two rows sharing the source external_id", () => {
    const record: HCRecord = {
      recordType: "BloodPressure",
      metadata: META,
      time: "2026-04-19T08:00:00Z",
      systolic: { inMillimetersOfMercury: 120 },
      diastolic: { inMillimetersOfMercury: 80 },
    };
    const out = mapRecord(record);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.metric_type).sort()).toEqual([
      "blood_pressure_diastolic",
      "blood_pressure_systolic",
    ]);
    expect(out[0]?.external_id).toMatch(/^hc-rec-1#(sys|dia)$/);
    expect(out[1]?.external_id).toMatch(/^hc-rec-1#(sys|dia)$/);
    expect(out[0]?.external_id).not.toBe(out[1]?.external_id);
  });
});

describe("mapRecord — unknown types", () => {
  it("returns empty rather than throwing", () => {
    expect(
      mapRecord({
        recordType: "ActivitySession" as never,
        metadata: META,
      })
    ).toEqual([]);
  });
});

describe("deletionTombstone", () => {
  it("builds a minimal deletion envelope (M7 fix — only external_id required)", () => {
    const t = deletionTombstone("hc-rec-99");
    expect(t).toEqual({ external_id: "hc-rec-99" });
    // No fake metric_type / value / unit / source padding any more —
    // the backend HealthDeletionIn schema only needs the id.
    expect(Object.keys(t)).toEqual(["external_id"]);
  });
});
