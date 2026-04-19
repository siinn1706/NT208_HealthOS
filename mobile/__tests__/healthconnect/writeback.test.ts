/**
 * Tests for the Phase 4 stretch write-back path. The mapper is pure so
 * the bulk of the logic is unit-testable without the SDK; we also cover
 * the "HC not installed -> silent no-op" branch so the manual-entry
 * flow stays robust on devices without Health Connect.
 */
import "../__setup__/env-fixture";

import { __setHealthConnectModuleForTests } from "@/healthconnect/client";
import {
  manualEntryToHcRecord,
  pushManualEntryToHealthConnect,
  pushBloodPressureToHealthConnect,
} from "@/healthconnect/writeback";
import type { HealthMetric } from "@/api/endpoints/health-metrics";

const baseMetric: HealthMetric = {
  id: "metric-1",
  metric_type: "weight_kg",
  value: 70.5,
  unit: "kg",
  recorded_at: "2026-04-19T12:00:00Z",
  source: "manual",
};

afterEach(() => {
  __setHealthConnectModuleForTests(null);
});

describe("manualEntryToHcRecord", () => {
  it("maps weight_kg to a HC WeightRecord with inKilograms", () => {
    const record = manualEntryToHcRecord(baseMetric, "client-1");
    expect(record).not.toBeNull();
    expect(record!.recordType).toBe("Weight");
    expect(record!.weight?.inKilograms).toBe(70.5);
    expect(record!.clientRecordId).toBe("client-1");
    // version is the recorded_at timestamp in epoch ms.
    expect(record!.clientRecordVersion).toBe(Date.parse("2026-04-19T12:00:00Z"));
  });

  it("maps steps to a 1-minute interval ending at recorded_at", () => {
    const r = manualEntryToHcRecord(
      { ...baseMetric, metric_type: "steps", value: 1500, unit: "steps" },
      "client-2"
    );
    expect(r).not.toBeNull();
    expect(r!.recordType).toBe("Steps");
    expect(r!.count).toBe(1500);
    expect(r!.endTime).toBe("2026-04-19T12:00:00Z");
    // Date.toISOString() always includes ms — accept the literal output.
    expect(r!.startTime).toBe("2026-04-19T11:59:00.000Z");
  });

  it("maps heart_rate to a single-sample HeartRateRecord", () => {
    const r = manualEntryToHcRecord(
      { ...baseMetric, metric_type: "heart_rate", value: 72, unit: "bpm" },
      "client-3"
    );
    expect(r).not.toBeNull();
    expect(r!.recordType).toBe("HeartRate");
    expect(r!.samples).toHaveLength(1);
    expect(r!.samples?.[0]?.beatsPerMinute).toBe(72);
  });

  it("returns null for sleep_minutes (cannot reconstruct start time)", () => {
    expect(
      manualEntryToHcRecord(
        { ...baseMetric, metric_type: "sleep_minutes", value: 480, unit: "min" },
        "client-x"
      )
    ).toBeNull();
  });

  it("returns null for individual BP halves (caller must pair them)", () => {
    expect(
      manualEntryToHcRecord(
        { ...baseMetric, metric_type: "blood_pressure_systolic", value: 120, unit: "mmHg" },
        "client-y"
      )
    ).toBeNull();
    expect(
      manualEntryToHcRecord(
        { ...baseMetric, metric_type: "blood_pressure_diastolic", value: 80, unit: "mmHg" },
        "client-z"
      )
    ).toBeNull();
  });

  it("returns null for malformed recorded_at", () => {
    expect(
      manualEntryToHcRecord(
        { ...baseMetric, recorded_at: "not-a-date" },
        "client-q"
      )
    ).toBeNull();
  });
});

describe("pushManualEntryToHealthConnect", () => {
  it("returns null silently when HC is not installed", async () => {
    // Don't set a test module — getAvailability() will return NotSupported
    // (or NotInstalled in production), and ensureInitialized throws
    // HealthConnectUnavailableError which the writeback swallows.
    const result = await pushManualEntryToHealthConnect(baseMetric, "client-1");
    expect(result).toBeNull();
  });

  it("calls insertRecords and returns the new HC id", async () => {
    const insertRecords = jest.fn().mockResolvedValue(["hc-new-id"]);
    __setHealthConnectModuleForTests({
      initialize: jest.fn().mockResolvedValue(true),
      getSdkStatus: jest.fn().mockResolvedValue(1),
      insertRecords,
      // Other methods unused by this test but required by the interface.
      requestPermission: jest.fn(),
      getGrantedPermissions: jest.fn(),
      revokeAllPermissions: jest.fn(),
      readRecords: jest.fn(),
      getChangesToken: jest.fn(),
      getChanges: jest.fn(),
    } as never);

    const result = await pushManualEntryToHealthConnect(baseMetric, "client-1");
    expect(result).toBe("hc-new-id");
    expect(insertRecords).toHaveBeenCalledTimes(1);
    const arg = insertRecords.mock.calls[0]![0];
    expect(arg).toHaveLength(1);
    expect(arg[0].recordType).toBe("Weight");
    expect(arg[0].weight.inKilograms).toBe(70.5);
  });
});

describe("pushBloodPressureToHealthConnect", () => {
  it("rejects mismatched halves", async () => {
    const sys: HealthMetric = {
      ...baseMetric,
      metric_type: "blood_pressure_systolic",
      value: 120,
    };
    const wrong: HealthMetric = {
      ...baseMetric,
      metric_type: "weight_kg",
      value: 80,
    };
    const result = await pushBloodPressureToHealthConnect(sys, wrong, "x");
    expect(result).toBeNull();
  });

  it("writes a paired HC BloodPressure record", async () => {
    const insertRecords = jest.fn().mockResolvedValue(["hc-bp-1"]);
    __setHealthConnectModuleForTests({
      initialize: jest.fn().mockResolvedValue(true),
      getSdkStatus: jest.fn().mockResolvedValue(1),
      insertRecords,
      requestPermission: jest.fn(),
      getGrantedPermissions: jest.fn(),
      revokeAllPermissions: jest.fn(),
      readRecords: jest.fn(),
      getChangesToken: jest.fn(),
      getChanges: jest.fn(),
    } as never);

    const sys: HealthMetric = {
      ...baseMetric,
      metric_type: "blood_pressure_systolic",
      value: 120,
      unit: "mmHg",
    };
    const dia: HealthMetric = {
      ...baseMetric,
      id: "metric-2",
      metric_type: "blood_pressure_diastolic",
      value: 80,
      unit: "mmHg",
    };
    const result = await pushBloodPressureToHealthConnect(
      sys,
      dia,
      "client-bp"
    );
    expect(result).toBe("hc-bp-1");
    const arg = insertRecords.mock.calls[0]![0];
    expect(arg[0].recordType).toBe("BloodPressure");
    expect(arg[0].systolic.inMillimetersOfMercury).toBe(120);
    expect(arg[0].diastolic.inMillimetersOfMercury).toBe(80);
  });
});
