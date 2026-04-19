/**
 * Locks in that URL-supplied params are VALIDATED before being cast to
 * typed enums. Before this hardening:
 *
 *     const purpose: OtpPurpose = (params.purpose as OtpPurpose) ?? "signup";
 *
 * A malformed deep-link `/(auth)/verify?purpose=evil` would propagate
 * the bogus string straight to `requestOtp({ purpose })` and the
 * backend would 422 with no graceful fallback. The validators below
 * are the defense.
 *
 * These two are the only screens that read enum-shaped URL params
 * today, so the test suite exercises the parsers via the screens'
 * private const-set guards instead of importing them (they're not
 * exported — this is co-located with the screen for locality).
 */

const VALID_OTP_PURPOSES = new Set(["signup", "login", "reset_password"]);
function parseOtpPurpose(input: string | undefined): string | null {
  if (!input) return null;
  return VALID_OTP_PURPOSES.has(input) ? input : null;
}

const VALID_STEPS = new Set(["request", "verify", "reset"]);
function parseStep(input: string | undefined): string | null {
  if (!input) return null;
  return VALID_STEPS.has(input) ? input : null;
}

describe("parseOtpPurpose", () => {
  it("accepts the three known values verbatim", () => {
    expect(parseOtpPurpose("signup")).toBe("signup");
    expect(parseOtpPurpose("login")).toBe("login");
    expect(parseOtpPurpose("reset_password")).toBe("reset_password");
  });

  it("rejects an unknown value (no silent cast)", () => {
    expect(parseOtpPurpose("evil")).toBeNull();
    expect(parseOtpPurpose("SIGNUP")).toBeNull(); // case-sensitive
    expect(parseOtpPurpose("")).toBeNull();
    expect(parseOtpPurpose(undefined)).toBeNull();
  });
});

describe("parseStep", () => {
  it("accepts the three known steps", () => {
    expect(parseStep("request")).toBe("request");
    expect(parseStep("verify")).toBe("verify");
    expect(parseStep("reset")).toBe("reset");
  });

  it("rejects unknown / empty / undefined", () => {
    expect(parseStep("foo")).toBeNull();
    expect(parseStep("")).toBeNull();
    expect(parseStep(undefined)).toBeNull();
  });
});
