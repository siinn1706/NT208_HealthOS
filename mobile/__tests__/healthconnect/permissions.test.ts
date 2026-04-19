/**
 * Tests for the HC permission classifier. We mock the SDK module so the
 * tests can verify "denied / partial / full" branching purely from
 * `requestPermission`'s return value.
 */
import "../__setup__/env-fixture";

import {
  __setHealthConnectModuleForTests,
} from "@/healthconnect/client";
import {
  getGrantedPermissions,
  requestPermissions,
} from "@/healthconnect/permissions";

const fakeSdk = (
  granted: { accessType: "read" | "write"; recordType: string }[]
) => ({
  initialize: jest.fn().mockResolvedValue(true),
  getSdkStatus: jest.fn().mockResolvedValue(1), // SDK_AVAILABLE
  requestPermission: jest.fn().mockResolvedValue(granted),
  getGrantedPermissions: jest.fn().mockResolvedValue(granted),
  revokeAllPermissions: jest.fn().mockResolvedValue(undefined),
  readRecords: jest.fn(),
  getChangesToken: jest.fn(),
  getChanges: jest.fn(),
});

afterEach(() => {
  __setHealthConnectModuleForTests(null);
});

describe("requestPermissions", () => {
  it("classifies full grant when all requested types are granted", async () => {
    __setHealthConnectModuleForTests(
      fakeSdk([
        { accessType: "read", recordType: "Steps" },
        { accessType: "read", recordType: "HeartRate" },
      ])
    );
    const r = await requestPermissions(["Steps", "HeartRate"]);
    expect(r.outcome).toBe("full");
    expect(r.missing).toEqual([]);
    expect(r.granted).toHaveLength(2);
  });

  it("classifies partial when some types are missing", async () => {
    __setHealthConnectModuleForTests(
      fakeSdk([{ accessType: "read", recordType: "Steps" }])
    );
    const r = await requestPermissions(["Steps", "HeartRate"]);
    expect(r.outcome).toBe("partial");
    expect(r.missing).toEqual(["HeartRate"]);
    expect(r.granted).toHaveLength(1);
  });

  it("classifies denied when nothing was granted", async () => {
    __setHealthConnectModuleForTests(fakeSdk([]));
    const r = await requestPermissions(["Steps", "HeartRate"]);
    expect(r.outcome).toBe("denied");
    expect(r.missing).toEqual(["Steps", "HeartRate"]);
    expect(r.granted).toEqual([]);
  });

  it("ignores write-only grants when the request was read-only", async () => {
    __setHealthConnectModuleForTests(
      fakeSdk([
        { accessType: "write", recordType: "Steps" },
      ])
    );
    const r = await requestPermissions(["Steps"]);
    expect(r.outcome).toBe("denied");
  });
});

describe("getGrantedPermissions (out-of-band revocation)", () => {
  it("flips a previously-full grant to partial when the user revoked one", async () => {
    __setHealthConnectModuleForTests(
      fakeSdk([{ accessType: "read", recordType: "Steps" }])
    );
    const r = await getGrantedPermissions(["Steps", "HeartRate"]);
    expect(r.outcome).toBe("partial");
    expect(r.missing).toEqual(["HeartRate"]);
  });

  it("flips a previously-partial grant to denied when the user revoked the rest", async () => {
    __setHealthConnectModuleForTests(fakeSdk([]));
    const r = await getGrantedPermissions(["Steps", "HeartRate"]);
    expect(r.outcome).toBe("denied");
  });
});
