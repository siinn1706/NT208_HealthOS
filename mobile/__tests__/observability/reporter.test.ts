/**
 * Observability shim should:
 *   - swallow domain (4xx) ApiErrors so they don't pollute the crash log
 *   - forward server (5xx) and unknown errors to the active adapter
 *   - call setUser when user changes
 */
import { ApiError } from "@/api/errors";
import {
  reportError,
  reportInfo,
  reportWarning,
  setReporterAdapter,
  setReporterTag,
  setReporterUser,
} from "@/observability/reporter";

interface Spy {
  exceptions: Array<{ error: unknown; level?: string }>;
  messages: Array<{ message: string; level?: string }>;
  users: Array<{ id: string; email?: string } | null>;
  tags: Array<{ key: string; value: string }>;
}

function spyAdapter(): Spy & { install(): void } {
  const spy: Spy = { exceptions: [], messages: [], users: [], tags: [] };
  return {
    ...spy,
    install() {
      setReporterAdapter({
        captureException: (error, options) => spy.exceptions.push({ error, level: options?.level }),
        captureMessage: (message, options) => spy.messages.push({ message, level: options?.level }),
        setUser: (u) => spy.users.push(u),
        setTag: (key, value) => spy.tags.push({ key, value }),
      });
    },
  };
}

describe("observability reporter", () => {
  it("forwards 5xx ApiErrors to the adapter", () => {
    const spy = spyAdapter();
    spy.install();
    reportError(new ApiError("UPSTREAM_ERROR", "boom", 503));
    expect(spy.exceptions).toHaveLength(1);
  });

  it("swallows 4xx ApiErrors (user-facing validation, not crashes)", () => {
    const spy = spyAdapter();
    spy.install();
    reportError(new ApiError("VALIDATION", "bad input", 422));
    reportError(new ApiError("AUTH_EXPIRED", "expired", 401));
    expect(spy.exceptions).toHaveLength(0);
  });

  it("forwards generic Error instances", () => {
    const spy = spyAdapter();
    spy.install();
    reportError(new Error("kaboom"));
    expect(spy.exceptions).toHaveLength(1);
  });

  it("captures messages at the right level", () => {
    const spy = spyAdapter();
    spy.install();
    reportWarning("hot stove");
    reportInfo("hello");
    expect(spy.messages.map((m) => m.level)).toEqual(["warn", "info"]);
  });

  it("propagates user identity + tags to the adapter", () => {
    const spy = spyAdapter();
    spy.install();
    setReporterUser({ id: "u1", email: "x@y.z" });
    setReporterUser(null);
    setReporterTag("channel", "dev");
    expect(spy.users).toEqual([{ id: "u1", email: "x@y.z" }, null]);
    expect(spy.tags).toEqual([{ key: "channel", value: "dev" }]);
  });
});
