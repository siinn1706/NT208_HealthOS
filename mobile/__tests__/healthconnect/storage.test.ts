/**
 * Tests for the foreground-sync debounce stamp. The SecureStore mock in
 * env-fixture.ts is an in-memory map — perfect for verifying the
 * "should we sync?" logic without touching the device.
 */
import "../__setup__/env-fixture";

import {
  FOREGROUND_SYNC_DEBOUNCE_MS,
  clearForegroundSyncStamp,
  getLastForegroundSyncMs,
  markForegroundSyncCompleted,
  shouldRunForegroundSync,
} from "@/healthconnect/storage";

describe("foreground sync debounce stamp", () => {
  beforeEach(async () => {
    await clearForegroundSyncStamp();
  });

  it("returns 0 when never set", async () => {
    expect(await getLastForegroundSyncMs()).toBe(0);
  });

  it("shouldRunForegroundSync is true on a fresh install", async () => {
    expect(await shouldRunForegroundSync()).toBe(true);
  });

  it("shouldRunForegroundSync is false within the debounce window", async () => {
    const now = 1_700_000_000_000;
    await markForegroundSyncCompleted(now);
    expect(await shouldRunForegroundSync(now + 1_000)).toBe(false);
    expect(
      await shouldRunForegroundSync(now + FOREGROUND_SYNC_DEBOUNCE_MS - 1)
    ).toBe(false);
  });

  it("shouldRunForegroundSync flips true once the debounce window elapses", async () => {
    const now = 1_700_000_000_000;
    await markForegroundSyncCompleted(now);
    expect(
      await shouldRunForegroundSync(now + FOREGROUND_SYNC_DEBOUNCE_MS)
    ).toBe(true);
    expect(
      await shouldRunForegroundSync(now + FOREGROUND_SYNC_DEBOUNCE_MS + 5_000)
    ).toBe(true);
  });

  it("clearForegroundSyncStamp resets the persisted timestamp", async () => {
    await markForegroundSyncCompleted(1_700_000_000_000);
    await clearForegroundSyncStamp();
    expect(await getLastForegroundSyncMs()).toBe(0);
  });
});
