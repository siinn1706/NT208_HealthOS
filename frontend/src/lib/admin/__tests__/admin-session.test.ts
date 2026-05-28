// admin-session.test.ts — unit + property tests for admin-session.ts
// Task 3.2: Property 12 — isAdmin is a pure function of roles and permissions
// Validates: Requirements 4.4

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isAdmin, ADMIN_ROLE, ADMIN_PERMISSION } from "../admin-session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Arbitrary string array that may or may not contain the magic string. */
const anyStringArray = fc.array(fc.string());

/** Arbitrary string array guaranteed to contain the magic string at least once. */
const arrayWithAdminRole = fc
  .array(fc.string())
  .chain((arr) =>
    fc.integer({ min: 0, max: arr.length }).map((idx) => {
      const copy = [...arr];
      copy.splice(idx, 0, ADMIN_ROLE);
      return copy;
    }),
  );

const arrayWithAdminPermission = fc
  .array(fc.string())
  .chain((arr) =>
    fc.integer({ min: 0, max: arr.length }).map((idx) => {
      const copy = [...arr];
      copy.splice(idx, 0, ADMIN_PERMISSION);
      return copy;
    }),
  );

/** Arbitrary string array guaranteed NOT to contain either magic string. */
const arrayWithoutMagicStrings = fc
  .array(
    fc.string().filter((s) => s !== ADMIN_ROLE && s !== ADMIN_PERMISSION),
  );

/** Nullable / undefined / non-array inputs. */
const nonArrayInput = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.integer().map((n) => n as unknown as string[]),
  fc.boolean().map((b) => b as unknown as string[]),
  fc.string().map((s) => s as unknown as string[]),
  fc.record({ foo: fc.string() }).map((o) => o as unknown as string[]),
);

// ---------------------------------------------------------------------------
// Property 12: isAdmin is a pure function of roles and permissions
// ---------------------------------------------------------------------------

describe("isAdmin — Property 12: pure function of roles and permissions", () => {
  // -------------------------------------------------------------------------
  // Correctness: returns true iff roles includes "admin" OR
  //              permissions includes "admin.access"
  // -------------------------------------------------------------------------

  it("returns true when roles contains ADMIN_ROLE", () => {
    fc.assert(
      fc.property(arrayWithAdminRole, anyStringArray, (roles, perms) => {
        expect(isAdmin(roles, perms)).toBe(true);
      }),
    );
  });

  it("returns true when permissions contains ADMIN_PERMISSION", () => {
    fc.assert(
      fc.property(anyStringArray, arrayWithAdminPermission, (roles, perms) => {
        expect(isAdmin(roles, perms)).toBe(true);
      }),
    );
  });

  it("returns false when neither array contains the magic strings", () => {
    fc.assert(
      fc.property(
        arrayWithoutMagicStrings,
        arrayWithoutMagicStrings,
        (roles, perms) => {
          expect(isAdmin(roles, perms)).toBe(false);
        },
      ),
    );
  });

  it("correctness: result equals r.includes(ADMIN_ROLE) || p.includes(ADMIN_PERMISSION) for any arrays", () => {
    fc.assert(
      fc.property(anyStringArray, anyStringArray, (roles, perms) => {
        const expected =
          roles.includes(ADMIN_ROLE) || perms.includes(ADMIN_PERMISSION);
        expect(isAdmin(roles, perms)).toBe(expected);
      }),
    );
  });

  // -------------------------------------------------------------------------
  // Idempotence: calling twice with the same args gives the same result
  // -------------------------------------------------------------------------

  it("idempotence: isAdmin(r, p) === isAdmin(r, p) for any arrays", () => {
    fc.assert(
      fc.property(anyStringArray, anyStringArray, (roles, perms) => {
        expect(isAdmin(roles, perms)).toBe(isAdmin(roles, perms));
      }),
    );
  });

  it("idempotence: isAdmin(r, p) === isAdmin(r, p) when roles contains ADMIN_ROLE", () => {
    fc.assert(
      fc.property(arrayWithAdminRole, anyStringArray, (roles, perms) => {
        expect(isAdmin(roles, perms)).toBe(isAdmin(roles, perms));
      }),
    );
  });

  // -------------------------------------------------------------------------
  // Edge cases: null / undefined / non-array inputs → false
  // -------------------------------------------------------------------------

  it("returns false when roles is null", () => {
    fc.assert(
      fc.property(anyStringArray, (perms) => {
        expect(isAdmin(null, perms)).toBe(
          perms.includes(ADMIN_PERMISSION),
        );
      }),
    );
  });

  it("returns false when permissions is null", () => {
    fc.assert(
      fc.property(anyStringArray, (roles) => {
        expect(isAdmin(roles, null)).toBe(roles.includes(ADMIN_ROLE));
      }),
    );
  });

  it("returns false when both roles and permissions are null", () => {
    expect(isAdmin(null, null)).toBe(false);
  });

  it("returns false when both roles and permissions are undefined", () => {
    expect(isAdmin(undefined, undefined)).toBe(false);
  });

  it("returns false when roles is a non-array value", () => {
    fc.assert(
      fc.property(nonArrayInput, anyStringArray, (roles, perms) => {
        // When roles is non-array, only permissions can grant access
        const expected = Array.isArray(perms) && perms.includes(ADMIN_PERMISSION);
        expect(isAdmin(roles, perms)).toBe(expected);
      }),
    );
  });

  it("returns false when permissions is a non-array value", () => {
    fc.assert(
      fc.property(anyStringArray, nonArrayInput, (roles, perms) => {
        // When perms is non-array, only roles can grant access
        const expected = Array.isArray(roles) && roles.includes(ADMIN_ROLE);
        expect(isAdmin(roles, perms)).toBe(expected);
      }),
    );
  });

  it("returns false when both inputs are non-array values", () => {
    fc.assert(
      fc.property(nonArrayInput, nonArrayInput, (roles, perms) => {
        expect(isAdmin(roles, perms)).toBe(false);
      }),
    );
  });

  // -------------------------------------------------------------------------
  // Specific unit examples
  // -------------------------------------------------------------------------

  it("returns true for exact admin role", () => {
    expect(isAdmin(["admin"], [])).toBe(true);
  });

  it("returns true for exact admin.access permission", () => {
    expect(isAdmin([], ["admin.access"])).toBe(true);
  });

  it("returns false for empty arrays", () => {
    expect(isAdmin([], [])).toBe(false);
  });

  it("returns false for roles with similar but not matching strings", () => {
    expect(isAdmin(["administrator", "Admin", "ADMIN"], [])).toBe(false);
  });

  it("returns false for permissions with similar but not matching strings", () => {
    expect(isAdmin([], ["admin", "admin.access.extra", "admin_access"])).toBe(false);
  });

  it("returns true when both role and permission are present", () => {
    expect(isAdmin(["admin"], ["admin.access"])).toBe(true);
  });
});
