/**
 * Vitest globalSetup — runs once before any test file, in a separate process.
 * Sets VITEST=true so bff-rate-limit.ts allows __setStoreForTests calls.
 * Each test file manages its own store via beforeEach.
 */
export function setup() {
  process.env.VITEST = "true";
  // Ensure tests don't accidentally hit a real Redis instance.
  delete process.env.REDIS_URL;
}

export function teardown() {
  // nothing to clean up
}
