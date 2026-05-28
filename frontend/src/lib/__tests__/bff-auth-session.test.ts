// bff-auth-session.test.ts — unit + property tests for bff-auth-session.ts
//
// Task 8.2: Property 10 — Session identifier-array shape
// Task 8.3: Property 11 — Session response excludes secret fields
// Task 8.4: Property 13 — 401 session response excludes roles and permissions
//
// Validates: Requirements 4.1, 4.2, 4.3, 4.6

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  filterIdentifierArray,
  stripSecretFields,
  readCoreSessionSnapshot,
} from "@/lib/bff-auth-session";

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

/** Regex for valid identifiers: [a-z0-9_.:-]+ */
const IDENTIFIER_RE = /^[a-z0-9_.:-]+$/;

/** Arbitrary valid identifier character. */
const validChar = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyz0123456789_.:-".split(""),
);

/** Arbitrary valid identifier string of length [minLen, maxLen]. */
function validIdentifier(minLen: number, maxLen: number) {
  return fc
    .integer({ min: minLen, max: maxLen })
    .chain((len) => fc.stringOf(validChar, { minLength: len, maxLength: len }));
}

/** Arbitrary invalid identifier: either wrong chars, empty, or too long. */
const invalidIdentifier = fc.oneof(
  // Contains uppercase
  fc.string({ minLength: 1 }).filter((s) => /[A-Z]/.test(s)),
  // Contains space
  fc.string({ minLength: 1 }).filter((s) => s.includes(" ")),
  // Contains special chars not in the set
  fc.string({ minLength: 1 }).filter((s) => /[^a-z0-9_.:-]/.test(s)),
  // Empty string
  fc.constant(""),
);

/** Arbitrary array of valid role identifiers (each 1–64 chars). */
const validRoleArray = fc.array(validIdentifier(1, 64), { maxLength: 32 });

/** Arbitrary array of valid permission identifiers (each 1–128 chars). */
const validPermissionArray = fc.array(validIdentifier(1, 128), { maxLength: 256 });

/** Secret field names that must never appear in session responses. */
const SECRET_FIELD_NAMES = [
  "access_token",
  "refresh_token",
  "mfa_secret",
  "mfa_recovery_codes",
  "password_hash",
  "oauth_token",
  "session_cookie",
] as const;

/** Arbitrary object that may contain secret fields at the top level. */
const objectWithSecrets = fc.record(
  Object.fromEntries(
    SECRET_FIELD_NAMES.map((k) => [k, fc.string()]),
  ) as Record<string, fc.Arbitrary<string>>,
  { requiredKeys: [] },
);

/** Arbitrary nested object that may contain secret fields at any depth. */
function nestedObjectWithSecrets(depth = 2): fc.Arbitrary<unknown> {
  if (depth === 0) {
    return fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null));
  }
  return fc.oneof(
    objectWithSecrets,
    fc.record({
      nested: nestedObjectWithSecrets(depth - 1),
      ...Object.fromEntries(
        SECRET_FIELD_NAMES.slice(0, 3).map((k) => [k, fc.string()]),
      ),
    }, { requiredKeys: [] }),
    fc.array(nestedObjectWithSecrets(depth - 1), { maxLength: 3 }),
  );
}

// ---------------------------------------------------------------------------
// Helper: recursively check that no secret key exists in a value
// ---------------------------------------------------------------------------
function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsSecretKey);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (SECRET_FIELD_NAMES.includes(key as typeof SECRET_FIELD_NAMES[number])) {
        return true;
      }
      if (containsSecretKey(obj[key])) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Property 10: Session identifier-array shape
// Feature: admin-console, Property 10: Session identifier-array shape
// ---------------------------------------------------------------------------

describe("filterIdentifierArray — Property 10: Session identifier-array shape", () => {
  // ── Roles: maxItems=32, minLen=1, maxLen=64 ──────────────────────────────

  it("accepts valid role arrays (≤32 items, each 1–64 chars, matching regex)", () => {
    fc.assert(
      fc.property(validRoleArray, (arr) => {
        const result = filterIdentifierArray(arr, 32, 1, 64);
        // All items in result must be valid
        expect(result.every((s) => IDENTIFIER_RE.test(s))).toBe(true);
        expect(result.every((s) => s.length >= 1 && s.length <= 64)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(32);
        // All input items should pass through (they are all valid)
        expect(result).toEqual(arr.slice(0, 32));
      }),
      { numRuns: 100 },
    );
  });

  it("accepts valid permission arrays (≤256 items, each 1–128 chars, matching regex)", () => {
    fc.assert(
      fc.property(validPermissionArray, (arr) => {
        const result = filterIdentifierArray(arr, 256, 1, 128);
        expect(result.every((s) => IDENTIFIER_RE.test(s))).toBe(true);
        expect(result.every((s) => s.length >= 1 && s.length <= 128)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(256);
        expect(result).toEqual(arr.slice(0, 256));
      }),
      { numRuns: 100 },
    );
  });

  it("rejects items that do not match [a-z0-9_.:-]+", () => {
    fc.assert(
      fc.property(
        fc.array(invalidIdentifier, { minLength: 1, maxLength: 10 }),
        (arr) => {
          const result = filterIdentifierArray(arr, 32, 1, 64);
          // All invalid items should be filtered out
          expect(result.every((s) => IDENTIFIER_RE.test(s))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("caps roles at 32 items even when input has more", () => {
    fc.assert(
      fc.property(
        fc.array(validIdentifier(1, 64), { minLength: 33, maxLength: 100 }),
        (arr) => {
          const result = filterIdentifierArray(arr, 32, 1, 64);
          expect(result.length).toBeLessThanOrEqual(32);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("caps permissions at 256 items even when input has more", () => {
    const permissions = Array.from({ length: 270 }, (_, i) => `perm:${i}`);
    const result = filterIdentifierArray(permissions, 256, 1, 128);
    expect(result).toHaveLength(256);
    expect(result).toEqual(permissions.slice(0, 256));
  });

  it("rejects items exceeding maxLen", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 65, max: 200 }).chain((len) =>
          fc.stringOf(validChar, { minLength: len, maxLength: len }),
        ),
        (longItem) => {
          const result = filterIdentifierArray([longItem], 32, 1, 64);
          expect(result).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects empty string (below minLen=1)", () => {
    const result = filterIdentifierArray([""], 32, 1, 64);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for non-array input", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.integer(),
          fc.boolean(),
        ),
        (nonArray) => {
          const result = filterIdentifierArray(nonArray, 32, 1, 64);
          expect(result).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("filters mixed valid/invalid arrays, keeping only valid items", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(validIdentifier(1, 64), invalidIdentifier),
          { maxLength: 50 },
        ),
        (mixed) => {
          const result = filterIdentifierArray(mixed, 32, 1, 64);
          // Every item in result must be valid
          expect(result.every((s) => IDENTIFIER_RE.test(s))).toBe(true);
          expect(result.every((s) => s.length >= 1 && s.length <= 64)).toBe(true);
          // Result must be a subset of the valid items in input
          const validItems = mixed.filter(
            (s) => typeof s === "string" && s.length >= 1 && s.length <= 64 && IDENTIFIER_RE.test(s),
          );
          expect(result.length).toBeLessThanOrEqual(Math.min(validItems.length, 32));
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Specific unit examples ────────────────────────────────────────────────

  it("accepts typical role identifiers", () => {
    expect(filterIdentifierArray(["admin", "user", "moderator"], 32, 1, 64)).toEqual([
      "admin",
      "user",
      "moderator",
    ]);
  });

  it("accepts typical permission identifiers", () => {
    expect(
      filterIdentifierArray(["admin.access", "user.read", "user.write:all"], 256, 1, 128),
    ).toEqual(["admin.access", "user.read", "user.write:all"]);
  });

  it("rejects uppercase characters", () => {
    expect(filterIdentifierArray(["Admin", "USER", "Moderator"], 32, 1, 64)).toEqual([]);
  });

  it("rejects items with spaces", () => {
    expect(filterIdentifierArray(["admin role", "user access"], 32, 1, 64)).toEqual([]);
  });

  it("defaults to empty array when input is undefined", () => {
    expect(filterIdentifierArray(undefined, 32, 1, 64)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Property 11: Session response excludes secret fields
// Feature: admin-console, Property 11: Session response excludes secret fields
// ---------------------------------------------------------------------------

describe("stripSecretFields — Property 11: Session response excludes secret fields", () => {
  it("removes all secret keys from a flat object", () => {
    fc.assert(
      fc.property(objectWithSecrets, (obj) => {
        const result = stripSecretFields(obj);
        expect(containsSecretKey(result)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("removes secret keys at any depth in nested objects", () => {
    fc.assert(
      fc.property(nestedObjectWithSecrets(3), (obj) => {
        const result = stripSecretFields(obj);
        expect(containsSecretKey(result)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("preserves non-secret keys", () => {
    const input = {
      user_id: "abc",
      email: "test@example.com",
      access_token: "secret",
      display_name: "Test User",
    };
    const result = stripSecretFields(input) as Record<string, unknown>;
    expect(result.user_id).toBe("abc");
    expect(result.email).toBe("test@example.com");
    expect(result.display_name).toBe("Test User");
    expect("access_token" in result).toBe(false);
  });

  it("handles arrays by stripping secrets from each element", () => {
    const input = [
      { access_token: "t1", user_id: "u1" },
      { refresh_token: "r1", email: "a@b.com" },
    ];
    const result = stripSecretFields(input) as Array<Record<string, unknown>>;
    expect(containsSecretKey(result)).toBe(false);
    expect(result[0].user_id).toBe("u1");
    expect(result[1].email).toBe("a@b.com");
  });

  it("returns primitives unchanged", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        (primitive) => {
          expect(stripSecretFields(primitive)).toBe(primitive);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("strips all seven secret field names", () => {
    const input: Record<string, string> = {};
    for (const key of SECRET_FIELD_NAMES) {
      input[key] = "should-be-removed";
    }
    const result = stripSecretFields(input) as Record<string, unknown>;
    for (const key of SECRET_FIELD_NAMES) {
      expect(key in result).toBe(false);
    }
  });

  it("strips secrets nested inside a data wrapper (Core response shape)", () => {
    const coreResponse = {
      data: {
        user_id: "u1",
        email: "user@example.com",
        access_token: "should-be-gone",
        mfa_secret: "also-gone",
        nested: {
          password_hash: "gone-too",
          display_name: "kept",
        },
      },
    };
    const result = stripSecretFields(coreResponse) as {
      data: Record<string, unknown>;
    };
    expect(containsSecretKey(result)).toBe(false);
    expect(result.data.user_id).toBe("u1");
    expect(result.data.email).toBe("user@example.com");
    expect((result.data.nested as Record<string, unknown>).display_name).toBe("kept");
  });
});

// ---------------------------------------------------------------------------
// Property 13: 401 session response excludes roles and permissions
// Feature: admin-console, Property 13: 401 session response excludes roles and permissions
// ---------------------------------------------------------------------------

describe("readCoreSessionSnapshot — Property 13: 401 session response excludes roles and permissions", () => {
  it("returns null for non-record payloads (simulating 401 / malformed response)", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.array(fc.string()),
        ),
        (payload) => {
          const result = readCoreSessionSnapshot(payload);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns null when payload has no data key", () => {
    fc.assert(
      fc.property(
        fc.record({ other: fc.string() }),
        (payload) => {
          const result = readCoreSessionSnapshot(payload);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns null when payload.data is not a record", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.string(),
          fc.integer(),
          fc.array(fc.string()),
        ),
        (data) => {
          const result = readCoreSessionSnapshot({ data });
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns a snapshot with roles=[] and permissions=[] when Core omits them", () => {
    const payload = {
      data: {
        user_id: "u1",
        email: "user@example.com",
        onboarding_status: "completed",
      },
    };
    const result = readCoreSessionSnapshot(payload);
    expect(result).not.toBeNull();
    expect(result!.roles).toEqual([]);
    expect(result!.permissions).toEqual([]);
  });

  it("normalizes Core /auth/me id into BFF user_id", () => {
    const payload = {
      data: {
        id: "u-from-auth-me",
        email: "user@example.com",
        onboarding_status: "completed",
      },
    };
    const result = readCoreSessionSnapshot(payload);
    expect(result).not.toBeNull();
    expect(result!.user_id).toBe("u-from-auth-me");
  });

  it("snapshot never contains roles or permissions keys when payload is null/undefined", () => {
    // Simulates the 401 path: no snapshot is returned, so no roles/permissions
    expect(readCoreSessionSnapshot(null)).toBeNull();
    expect(readCoreSessionSnapshot(undefined)).toBeNull();
  });

  it("snapshot does not contain secret fields", () => {
    fc.assert(
      fc.property(
        fc.record({
          user_id: fc.string(),
          email: fc.string(),
          access_token: fc.string(),
          refresh_token: fc.string(),
          mfa_secret: fc.string(),
          password_hash: fc.string(),
          roles: fc.array(validIdentifier(1, 64), { maxLength: 5 }),
          permissions: fc.array(validIdentifier(1, 128), { maxLength: 5 }),
        }),
        (data) => {
          const result = readCoreSessionSnapshot({ data });
          if (result === null) return; // null is fine for invalid payloads
          // The snapshot itself must not contain secret fields
          const resultObj = result as unknown as Record<string, unknown>;
          for (const secretKey of SECRET_FIELD_NAMES) {
            expect(secretKey in resultObj).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("snapshot includes roles and permissions when Core provides valid arrays", () => {
    const payload = {
      data: {
        user_id: "u1",
        email: "admin@example.com",
        onboarding_status: "completed",
        roles: ["admin", "user"],
        permissions: ["admin.access", "user.read"],
      },
    };
    const result = readCoreSessionSnapshot(payload);
    expect(result).not.toBeNull();
    expect(result!.roles).toEqual(["admin", "user"]);
    expect(result!.permissions).toEqual(["admin.access", "user.read"]);
  });

  it("snapshot filters invalid role/permission identifiers from Core response", () => {
    const payload = {
      data: {
        user_id: "u1",
        email: "user@example.com",
        roles: ["admin", "INVALID_UPPERCASE", "valid.role", ""],
        permissions: ["admin.access", "Bad Permission", "ok:perm"],
      },
    };
    const result = readCoreSessionSnapshot(payload);
    expect(result).not.toBeNull();
    expect(result!.roles).toEqual(["admin", "valid.role"]);
    expect(result!.permissions).toEqual(["admin.access", "ok:perm"]);
  });
});
