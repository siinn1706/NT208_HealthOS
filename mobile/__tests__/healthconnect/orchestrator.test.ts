/**
 * Tests for the orchestrator. We stub:
 *   - the HC SDK module (via __setHealthConnectModuleForTests)
 *   - global.fetch (so the api/client doesn't need a real network)
 *
 * Three scenarios cover the contract:
 *   1. Token-already-present + delta path: getChanges returns a few
 *      upserts, the batch is POSTed with the new token, foreground
 *      stamp is updated.
 *   2. Token-expired path: getChanges signals expiry, we fall back to
 *      a 14-day window read, init a fresh token, ship the batch.
 *   3. Empty-state init path: no token in BE state, orchestrator does
 *      a windowed bootstrap read, ships the resulting records, and
 *      persists the new token.
 */
import "../__setup__/env-fixture";

import { __setHealthConnectModuleForTests } from "@/healthconnect/client";
import { syncDevice } from "@/healthconnect/orchestrator";
import { sessionStore } from "@/auth/session";

const DEVICE_ID = "00000000-0000-0000-0000-000000000001";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/json" : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function makeSdk(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    initialize: jest.fn().mockResolvedValue(true),
    getSdkStatus: jest.fn().mockResolvedValue(1),
    requestPermission: jest.fn(),
    getGrantedPermissions: jest.fn(),
    revokeAllPermissions: jest.fn(),
    readRecords: jest.fn().mockResolvedValue({ records: [], pageToken: undefined }),
    getChangesToken: jest.fn().mockResolvedValue("fresh-token"),
    getChanges: jest.fn().mockResolvedValue({
      changes: [],
      nextChangesToken: "next-token",
      hasMore: false,
      changesTokenExpired: false,
    }),
    ...overrides,
  };
}

describe("orchestrator.syncDevice", () => {
  beforeEach(async () => {
    await sessionStore.getState().setToken("test-token");
  });

  afterEach(() => {
    __setHealthConnectModuleForTests(null);
    jest.restoreAllMocks();
  });

  it("delta path — uses existing token, ships records with the new token", async () => {
    __setHealthConnectModuleForTests(
      makeSdk({
        getChanges: jest.fn().mockResolvedValue({
          changes: [
            {
              type: "Upsert",
              record: {
                recordType: "Steps",
                metadata: { id: "rec-1", clientRecordVersion: 1 },
                endTime: "2026-04-19T12:00:00Z",
                count: 500,
              },
            },
          ],
          nextChangesToken: "delta-next",
          hasMore: false,
          changesTokenExpired: false,
        }),
      })
    );

    const calls: { url: string; init: RequestInit }[] = [];
    jest.spyOn(global, "fetch" as never).mockImplementation((async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      // GET /sync-state — return one Steps token.
      if (url.includes("/sync-state") && (init.method ?? "GET") === "GET") {
        return mockResponse(200, {
          data: [
            {
              record_type: "Steps",
              changes_token: "existing-token",
              last_synced_at: null,
              last_attempted_at: null,
              consecutive_failures: 0,
            },
          ],
        });
      }
      // POST /ingest — return a happy result.
      return mockResponse(200, {
        data: { inserted: 1, updated: 0, deleted: 0, skipped: 0, errors: [] },
      });
    }) as never);

    const summary = await syncDevice(DEVICE_ID, { recordTypes: ["Steps"] });

    expect(summary.ingest.inserted).toBe(1);
    const ingestCall = calls.find((c) => c.url.includes("/ingest"));
    expect(ingestCall).toBeDefined();
    const body = JSON.parse(ingestCall!.init.body as string);
    expect(body.records).toHaveLength(1);
    expect(body.records[0].external_id).toBe("rec-1");
    expect(body.next_changes_tokens.Steps).toBe("delta-next");
    // Idempotency-Key was attached. Headers may be a Headers instance OR a
    // plain object depending on how fetch was constructed; check both shapes.
    const headers = ingestCall!.init.headers;
    const headerValue =
      headers instanceof Headers
        ? headers.get("idempotency-key")
        : (headers as Record<string, string>)?.["Idempotency-Key"] ??
          (headers as Record<string, string>)?.["idempotency-key"];
    expect(headerValue).toBeTruthy();
  });

  it("expired-token path — falls back to windowed read + fresh token", async () => {
    const records = [
      {
        recordType: "Steps",
        metadata: { id: "boot-1", clientRecordVersion: 1 },
        endTime: "2026-04-15T12:00:00Z",
        count: 1000,
      },
      {
        recordType: "Steps",
        metadata: { id: "boot-2", clientRecordVersion: 1 },
        endTime: "2026-04-16T12:00:00Z",
        count: 1500,
      },
    ];
    __setHealthConnectModuleForTests(
      makeSdk({
        getChanges: jest.fn().mockResolvedValue({
          changesTokenExpired: true,
          changes: [],
        }),
        readRecords: jest.fn().mockResolvedValue({ records }),
        getChangesToken: jest.fn().mockResolvedValue("freshly-issued"),
      })
    );

    let ingestBody: Record<string, unknown> | null = null;
    jest.spyOn(global, "fetch" as never).mockImplementation((async (url: string, init: RequestInit) => {
      if (url.includes("/sync-state") && (init.method ?? "GET") === "GET") {
        return mockResponse(200, {
          data: [
            {
              record_type: "Steps",
              changes_token: "stale-token",
              last_synced_at: null,
              last_attempted_at: null,
              consecutive_failures: 0,
            },
          ],
        });
      }
      ingestBody = JSON.parse(init.body as string);
      return mockResponse(200, {
        data: { inserted: 2, updated: 0, deleted: 0, skipped: 0, errors: [] },
      });
    }) as never);

    const summary = await syncDevice(DEVICE_ID, { recordTypes: ["Steps"] });

    expect(summary.perRecordType[0]?.mode).toBe("bootstrap");
    expect((ingestBody as never as { records: unknown[] }).records).toHaveLength(2);
    expect((ingestBody as never as { next_changes_tokens: Record<string, string> }).next_changes_tokens.Steps).toBe(
      "freshly-issued"
    );
  });

  it("first-run init path — no existing token, no records, fresh token persisted", async () => {
    __setHealthConnectModuleForTests(
      makeSdk({
        readRecords: jest.fn().mockResolvedValue({ records: [] }),
        getChangesToken: jest.fn().mockResolvedValue("first-token"),
      })
    );

    let ingestBody: Record<string, unknown> | null = null;
    jest.spyOn(global, "fetch" as never).mockImplementation((async (url: string, init: RequestInit) => {
      if (url.includes("/sync-state") && (init.method ?? "GET") === "GET") {
        return mockResponse(200, { data: [] });
      }
      ingestBody = JSON.parse(init.body as string);
      return mockResponse(200, {
        data: { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] },
      });
    }) as never);

    const summary = await syncDevice(DEVICE_ID, {
      recordTypes: ["Steps"],
      bootstrapDays: 0,
    });

    expect(summary.perRecordType[0]?.mode).toBe("init");
    expect(summary.perRecordType[0]?.mapped).toBe(0);
    expect((ingestBody as never as { records: unknown[] }).records).toEqual([]);
    expect((ingestBody as never as { next_changes_tokens: Record<string, string> }).next_changes_tokens.Steps).toBe(
      "first-token"
    );
  });
});
