// admin-validation.test.ts — unit + property tests for admin-validation.ts
// Tests implemented in tasks 4.2–4.5
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  usersListQuerySchema,
  banBodySchema,
  assignSubscriptionBodySchema,
  planPatchSchema,
  PLAN_CODES,
  SUBSCRIPTION_STATUSES,
  validationErrorResponse,
} from "../admin-validation";

describe("validationErrorResponse", () => {
  it("uses Zod 4 issues as validation details", () => {
    const result = usersListQuerySchema.safeParse({ page: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(validationErrorResponse(result.error).error.details).toBe(result.error.issues);
    }
  });
});

/**
 * Validates: Requirements 3.2
 *
 * Property 5: BFF rejects out-of-bounds users-list query
 *
 * For any tuple (search, status, page, page_size), safeParse succeeds iff:
 *   - search.length <= 200
 *   - status ∈ ["all", "active", "banned", "deleted"]
 *   - page is an integer >= 1
 *   - page_size is an integer in [1, 100]
 */
describe("Property 5: BFF rejects out-of-bounds users-list query", () => {
  const VALID_STATUSES = ["all", "active", "banned", "deleted"] as const;

  // Arbitrary for status: mix valid enum values with arbitrary strings
  const statusArb = fc.oneof(
    fc.constantFrom(...VALID_STATUSES),
    fc.string(),
  );

  // Arbitrary for page/page_size: integers (positive, negative, zero, large)
  const intArb = fc.integer({ min: -10, max: 200 });

  it("accepts valid tuples and rejects invalid ones", () => {
    fc.assert(
      fc.property(
        fc.string(),   // search — any string
        statusArb,     // status
        intArb,        // page
        intArb,        // page_size
        (search, status, page, page_size) => {
          const result = usersListQuerySchema.safeParse({
            search,
            status,
            page,
            page_size,
          });

          const shouldSucceed =
            search.length <= 200 &&
            (VALID_STATUSES as readonly string[]).includes(status) &&
            Number.isInteger(page) && page >= 1 &&
            Number.isInteger(page_size) && page_size >= 1 && page_size <= 100;

          expect(result.success).toBe(shouldSucceed);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Boundary: search length exactly 200 (valid) vs 201 (invalid)
  it("accepts search of length exactly 200", () => {
    const result = usersListQuerySchema.safeParse({
      search: "a".repeat(200),
      status: "all",
      page: 1,
      page_size: 20,
    });
    expect(result.success).toBe(true);
  });

  it("rejects search of length 201", () => {
    const result = usersListQuerySchema.safeParse({
      search: "a".repeat(201),
      status: "all",
      page: 1,
      page_size: 20,
    });
    expect(result.success).toBe(false);
  });

  // Boundary: page_size exactly 100 (valid) vs 101 (invalid)
  it("accepts page_size of exactly 100", () => {
    const result = usersListQuerySchema.safeParse({
      search: "",
      status: "all",
      page: 1,
      page_size: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects page_size of 101", () => {
    const result = usersListQuerySchema.safeParse({
      search: "",
      status: "all",
      page: 1,
      page_size: 101,
    });
    expect(result.success).toBe(false);
  });

  // Boundary: page exactly 1 (valid) vs 0 (invalid)
  it("accepts page of exactly 1", () => {
    const result = usersListQuerySchema.safeParse({
      search: "",
      status: "active",
      page: 1,
      page_size: 20,
    });
    expect(result.success).toBe(true);
  });

  it("rejects page of 0", () => {
    const result = usersListQuerySchema.safeParse({
      search: "",
      status: "active",
      page: 0,
      page_size: 20,
    });
    expect(result.success).toBe(false);
  });

  // Invalid status values
  it("rejects unknown status values", () => {
    const result = usersListQuerySchema.safeParse({
      search: "",
      status: "suspended",
      page: 1,
      page_size: 20,
    });
    expect(result.success).toBe(false);
  });

  // Coercion: string numbers are coerced for page/page_size
  it("coerces string numbers for page and page_size", () => {
    const result = usersListQuerySchema.safeParse({
      search: "",
      status: "all",
      page: "5",
      page_size: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.page_size).toBe(50);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 28: Plan edit-modal validation and PATCH payload
// Feature: admin-console, Property 28: Plan edit-modal validation and PATCH payload
// Validates: Requirements 9.4, 9.5
// ---------------------------------------------------------------------------

describe("Property 28: Plan edit-modal validation and PATCH payload", () => {
  // -------------------------------------------------------------------------
  // Valid payloads: every generated combination should parse successfully
  // -------------------------------------------------------------------------

  it("accepts any partial payload where all present fields are within bounds", () => {
    // **Validates: Requirements 9.4, 9.5**
    const validPayloadArb = fc.record(
      {
        price_vnd: fc.integer({ min: 0, max: 1_000_000_000_000 }),
        description: fc.string({ maxLength: 1000 }),
        features: fc.constantFrom("{}", "[]", '{"key":"value"}', '{"a":1}'),
        limits: fc.constantFrom("{}", "[]", '{"key":"value"}', '{"b":2}'),
        is_active: fc.boolean(),
        is_recommended: fc.boolean(),
      },
      { withDeletedKeys: true },
    );

    fc.assert(
      fc.property(validPayloadArb, (payload) => {
        const result = planPatchSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("accepts the minimal valid payload (empty object — all fields optional)", () => {
    // **Validates: Requirements 9.4**
    const result = planPatchSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts price_vnd at boundary values 0 and 1_000_000_000_000", () => {
    // **Validates: Requirements 9.4**
    expect(planPatchSchema.safeParse({ price_vnd: 0 }).success).toBe(true);
    expect(
      planPatchSchema.safeParse({ price_vnd: 1_000_000_000_000 }).success,
    ).toBe(true);
  });

  // -------------------------------------------------------------------------
  // price_vnd: must be integer in [0, 1_000_000_000_000]
  // -------------------------------------------------------------------------

  it("rejects price_vnd below 0", () => {
    // **Validates: Requirements 9.4**
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: -1 }), (n) => {
        const result = planPatchSchema.safeParse({ price_vnd: n });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects price_vnd above 1_000_000_000_000", () => {
    // **Validates: Requirements 9.4**
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000_000_001, max: 2_000_000_000_000 }),
        (n) => {
          const result = planPatchSchema.safeParse({ price_vnd: n });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects non-integer price_vnd (float)", () => {
    // **Validates: Requirements 9.4**
    // Use Math.fround to ensure 32-bit float compatibility with fast-check
    fc.assert(
      fc.property(
        fc
          .float({
            min: Math.fround(0.01),
            max: Math.fround(999_999_936),
            noNaN: true,
          })
          .filter((n) => !Number.isInteger(n)),
        (n) => {
          const result = planPatchSchema.safeParse({ price_vnd: n });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // description: must be string with length <= 1000
  // -------------------------------------------------------------------------

  it("accepts description with length exactly 1000", () => {
    // **Validates: Requirements 9.4**
    const result = planPatchSchema.safeParse({
      description: "a".repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects description exceeding 1000 characters", () => {
    // **Validates: Requirements 9.4**
    fc.assert(
      fc.property(fc.integer({ min: 1001, max: 2000 }), (len) => {
        const result = planPatchSchema.safeParse({
          description: "x".repeat(len),
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  // -------------------------------------------------------------------------
  // features: must be valid JSON string with length <= 8 * 1024
  // -------------------------------------------------------------------------

  it("accepts features that are valid JSON strings within 8 KB", () => {
    // **Validates: Requirements 9.4**
    const validJsonArb = fc.constantFrom(
      "{}",
      "[]",
      '{"key":"value"}',
      '"string"',
      "42",
      "true",
      "null",
    );

    fc.assert(
      fc.property(validJsonArb, (json) => {
        const result = planPatchSchema.safeParse({ features: json });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects features that are not valid JSON", () => {
    // **Validates: Requirements 9.4**
    const invalidJsonArb = fc.constantFrom(
      "{invalid}",
      "undefined",
      "{key: value}",
      "[1,2,",
      "{'single': 'quotes'}",
    );

    fc.assert(
      fc.property(invalidJsonArb, (s) => {
        const result = planPatchSchema.safeParse({ features: s });
        expect(result.success).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it("rejects features exceeding 8 KB", () => {
    // **Validates: Requirements 9.4**
    // Build a valid JSON string that exceeds 8 * 1024 bytes
    const oversizedFeatures = '{"data":"' + "x".repeat(8 * 1024 + 10) + '"}';
    expect(oversizedFeatures.length).toBeGreaterThan(8 * 1024);
    const result = planPatchSchema.safeParse({ features: oversizedFeatures });
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // limits: must be valid JSON string with length <= 8 * 1024
  // -------------------------------------------------------------------------

  it("accepts limits that are valid JSON strings within 8 KB", () => {
    // **Validates: Requirements 9.4**
    const validJsonArb = fc.constantFrom(
      "{}",
      "[]",
      '{"max_users":100}',
      '"unlimited"',
      "0",
    );

    fc.assert(
      fc.property(validJsonArb, (json) => {
        const result = planPatchSchema.safeParse({ limits: json });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects limits that are not valid JSON", () => {
    // **Validates: Requirements 9.4**
    const invalidJsonArb = fc.constantFrom(
      "{invalid}",
      "undefined",
      "not json at all",
      "[unclosed",
    );

    fc.assert(
      fc.property(invalidJsonArb, (s) => {
        const result = planPatchSchema.safeParse({ limits: s });
        expect(result.success).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it("rejects limits exceeding 8 KB", () => {
    // **Validates: Requirements 9.4**
    const oversizedLimits = '{"data":"' + "y".repeat(8 * 1024 + 10) + '"}';
    expect(oversizedLimits.length).toBeGreaterThan(8 * 1024);
    const result = planPatchSchema.safeParse({ limits: oversizedLimits });
    expect(result.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Combined: safeParse succeeds iff each present field meets its bound
  // -------------------------------------------------------------------------

  it("safeParse succeeds for valid price_vnd payloads (task-spec generator)", () => {
    // **Validates: Requirements 9.4, 9.5**
    // Feature: admin-console, Property 28: Plan edit-modal validation and PATCH payload
    // Uses the exact generator from the task specification
    fc.assert(
      fc.property(
        fc.record(
          { price_vnd: fc.integer({ min: 0, max: 1_000_000_000_000 }) },
          { withDeletedKeys: true },
        ),
        (payload) => {
          const result = planPatchSchema.safeParse(payload);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("safeParse fails when any present field violates its bound", () => {
    // **Validates: Requirements 9.4, 9.5**
    // Feature: admin-console, Property 28: Plan edit-modal validation and PATCH payload
    const invalidPayloadArb = fc.oneof(
      // Invalid price_vnd (negative)
      fc.record({ price_vnd: fc.integer({ min: -1_000_000, max: -1 }) }),
      // Invalid price_vnd (too large)
      fc.record({
        price_vnd: fc.integer({
          min: 1_000_000_000_001,
          max: 2_000_000_000_000,
        }),
      }),
      // Invalid description (too long)
      fc.record({
        description: fc
          .integer({ min: 1001, max: 2000 })
          .map((len) => "x".repeat(len)),
      }),
      // Invalid features (not JSON)
      fc.record({
        features: fc.constantFrom("{invalid}", "undefined", "{key: value}"),
      }),
      // Invalid limits (not JSON)
      fc.record({
        limits: fc.constantFrom("{invalid}", "undefined", "[unclosed"),
      }),
    );

    fc.assert(
      fc.property(invalidPayloadArb, (payload) => {
        const result = planPatchSchema.safeParse(payload);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 7: BFF rejects malformed assignment body
 *
 * Validates: Requirements 3.8
 *
 * For any tuple (plan_code, status, expires_at?, admin_note?),
 * assignSubscriptionBodySchema.safeParse(...) succeeds iff:
 *   - plan_code ∈ PLAN_CODES  ["free", "basic", "family", "professional"]
 *   - status ∈ SUBSCRIPTION_STATUSES  ["active", "trialing", "past_due", "canceled", "expired"]
 *   - expires_at parses as ISO 8601 datetime with timezone offset if present
 *   - admin_note.length <= 500 if present
 */
describe("Property 7: BFF rejects malformed assignment body", () => {
  // ---------------------------------------------------------------------------
  // Generators
  // ---------------------------------------------------------------------------

  /** Valid ISO 8601 datetime strings with UTC or numeric offset */
  const validDatetimeArb = fc.constantFrom(
    "2024-01-01T00:00:00Z",
    "2024-06-15T12:30:00+07:00",
    "2023-12-31T23:59:59-05:00",
    "2025-03-20T08:00:00+00:00",
    "2024-02-29T00:00:00Z", // leap year
  );

  /**
   * Invalid datetime strings — plain dates, random strings, empty, or
   * datetimes without timezone offset (Zod requires offset: true).
   */
  const invalidDatetimeArb = fc.oneof(
    fc.constantFrom(
      "2024-01-01",           // date only, no time
      "not-a-date",
      "",
      "2024-01-01T00:00:00",  // missing timezone offset
      "2024-13-01T00:00:00Z", // invalid month
      "hello world",
    ),
    // random strings that are very unlikely to be valid ISO 8601 with offset
    fc.string({ minLength: 1, maxLength: 20 }).filter(
      (s) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/.test(s),
    ),
  );

  /** admin_note within the 500-char limit */
  const validNoteArb = fc.string({ maxLength: 500 });

  /** admin_note exceeding the 500-char limit */
  const invalidNoteArb = fc.string({ minLength: 501, maxLength: 600 });

  // ---------------------------------------------------------------------------
  // Helper: build a body object, omitting undefined optional fields
  // ---------------------------------------------------------------------------
  function buildBody(
    plan_code: string,
    status: string,
    expires_at?: string,
    admin_note?: string,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = { plan_code, status };
    if (expires_at !== undefined) body.expires_at = expires_at;
    if (admin_note !== undefined) body.admin_note = admin_note;
    return body;
  }

  // ---------------------------------------------------------------------------
  // Sub-test 1: valid plan_code + valid status (no optionals) → always passes
  // ---------------------------------------------------------------------------
  it("accepts valid plan_code and status without optional fields", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLAN_CODES),
        fc.constantFrom(...SUBSCRIPTION_STATUSES),
        (plan_code, status) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status),
          );
          expect(result.success).toBe(true);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 2: invalid plan_code → always fails
  // ---------------------------------------------------------------------------
  it("rejects invalid plan_code regardless of other fields", () => {
    const invalidPlanArb = fc.string().filter(
      (s) => !(PLAN_CODES as readonly string[]).includes(s),
    );

    fc.assert(
      fc.property(
        invalidPlanArb,
        fc.constantFrom(...SUBSCRIPTION_STATUSES),
        (plan_code, status) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status),
          );
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 3: invalid status → always fails
  // ---------------------------------------------------------------------------
  it("rejects invalid status regardless of other fields", () => {
    const invalidStatusArb = fc.string().filter(
      (s) => !(SUBSCRIPTION_STATUSES as readonly string[]).includes(s),
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...PLAN_CODES),
        invalidStatusArb,
        (plan_code, status) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status),
          );
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 4: valid expires_at (ISO 8601 with offset) → passes
  // ---------------------------------------------------------------------------
  it("accepts valid ISO 8601 datetime with offset for expires_at", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLAN_CODES),
        fc.constantFrom(...SUBSCRIPTION_STATUSES),
        validDatetimeArb,
        (plan_code, status, expires_at) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status, expires_at),
          );
          expect(result.success).toBe(true);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 5: invalid expires_at → fails
  // ---------------------------------------------------------------------------
  it("rejects non-ISO-8601 expires_at", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLAN_CODES),
        fc.constantFrom(...SUBSCRIPTION_STATUSES),
        invalidDatetimeArb,
        (plan_code, status, expires_at) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status, expires_at),
          );
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 6: admin_note within 500 chars → passes
  // ---------------------------------------------------------------------------
  it("accepts admin_note with length <= 500", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLAN_CODES),
        fc.constantFrom(...SUBSCRIPTION_STATUSES),
        validNoteArb,
        (plan_code, status, admin_note) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status, undefined, admin_note),
          );
          expect(result.success).toBe(true);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 7: admin_note exceeding 500 chars → fails
  // ---------------------------------------------------------------------------
  it("rejects admin_note with length > 500", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLAN_CODES),
        fc.constantFrom(...SUBSCRIPTION_STATUSES),
        invalidNoteArb,
        (plan_code, status, admin_note) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status, undefined, admin_note),
          );
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 8: all valid fields together → passes
  // ---------------------------------------------------------------------------
  it("accepts all valid fields together", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLAN_CODES),
        fc.constantFrom(...SUBSCRIPTION_STATUSES),
        validDatetimeArb,
        validNoteArb,
        (plan_code, status, expires_at, admin_note) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status, expires_at, admin_note),
          );
          expect(result.success).toBe(true);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Sub-test 9: combined invalid plan + invalid status → fails
  // ---------------------------------------------------------------------------
  it("rejects body with both invalid plan_code and invalid status", () => {
    const invalidPlanArb = fc.string().filter(
      (s) => !(PLAN_CODES as readonly string[]).includes(s),
    );
    const invalidStatusArb = fc.string().filter(
      (s) => !(SUBSCRIPTION_STATUSES as readonly string[]).includes(s),
    );

    fc.assert(
      fc.property(
        invalidPlanArb,
        invalidStatusArb,
        (plan_code, status) => {
          const result = assignSubscriptionBodySchema.safeParse(
            buildBody(plan_code, status),
          );
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Example-based edge cases
  // ---------------------------------------------------------------------------

  it("rejects missing plan_code", () => {
    expect(
      assignSubscriptionBodySchema.safeParse({ status: "active" }).success,
    ).toBe(false);
  });

  it("rejects missing status", () => {
    expect(
      assignSubscriptionBodySchema.safeParse({ plan_code: "free" }).success,
    ).toBe(false);
  });

  it("accepts expires_at omitted entirely (optional field)", () => {
    expect(
      assignSubscriptionBodySchema.safeParse({
        plan_code: "basic",
        status: "trialing",
      }).success,
    ).toBe(true);
  });

  it("accepts admin_note omitted entirely (optional field)", () => {
    expect(
      assignSubscriptionBodySchema.safeParse({
        plan_code: "professional",
        status: "canceled",
      }).success,
    ).toBe(true);
  });

  it("accepts admin_note of exactly 500 characters", () => {
    expect(
      assignSubscriptionBodySchema.safeParse({
        plan_code: "family",
        status: "expired",
        admin_note: "x".repeat(500),
      }).success,
    ).toBe(true);
  });

  it("rejects admin_note of 501 characters", () => {
    expect(
      assignSubscriptionBodySchema.safeParse({
        plan_code: "family",
        status: "expired",
        admin_note: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

/**
 * Property 6: BFF rejects malformed ban body
 * Validates: Requirements 3.4
 *
 * banBodySchema.safeParse(obj) succeeds iff:
 *   - obj.reason is a string, AND
 *   - obj.reason.trim().length ∈ [1, 500]
 */
describe("Property 6: BFF rejects malformed ban body", () => {
  // -------------------------------------------------------------------------
  // Example-based cases (fixed contracts)
  // -------------------------------------------------------------------------

  it("rejects when reason is missing", () => {
    expect(banBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects when reason is null", () => {
    expect(banBodySchema.safeParse({ reason: null }).success).toBe(false);
  });

  it("rejects when reason is empty string", () => {
    expect(banBodySchema.safeParse({ reason: "" }).success).toBe(false);
  });

  it("rejects when reason is whitespace-only", () => {
    expect(banBodySchema.safeParse({ reason: "   " }).success).toBe(false);
    expect(banBodySchema.safeParse({ reason: "\t\n" }).success).toBe(false);
  });

  it("accepts a valid non-empty string", () => {
    expect(banBodySchema.safeParse({ reason: "Spam" }).success).toBe(true);
  });

  it("accepts a string that trims to exactly 1 character", () => {
    // "  a  " trims to "a" (length 1) — must pass per spec
    expect(banBodySchema.safeParse({ reason: "  a  " }).success).toBe(true);
  });

  it("accepts a string of exactly 500 non-whitespace characters", () => {
    const reason = "x".repeat(500);
    expect(banBodySchema.safeParse({ reason }).success).toBe(true);
  });

  it("rejects a string whose trimmed length exceeds 500", () => {
    const reason = "x".repeat(501);
    expect(banBodySchema.safeParse({ reason }).success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Property: valid-shaped inputs — fc.record({ reason: fc.string() })
  // -------------------------------------------------------------------------

  it("accepts iff reason.trim().length ∈ [1, 500] (valid-shaped inputs)", () => {
    fc.assert(
      fc.property(
        fc.record({ reason: fc.string() }),
        (obj) => {
          const result = banBodySchema.safeParse(obj);
          const trimmedLen = obj.reason.trim().length;
          const shouldPass = trimmedLen >= 1 && trimmedLen <= 500;
          return result.success === shouldPass;
        },
      ),
      { numRuns: 1000 },
    );
  });

  // -------------------------------------------------------------------------
  // Property: mixed inputs — valid records, null reason, missing reason
  // -------------------------------------------------------------------------

  it("accepts iff reason is a string with trim().length ∈ [1, 500] (mixed inputs)", () => {
    const mixedArb = fc.oneof(
      fc.record({ reason: fc.string() }),
      fc.record({ reason: fc.constant(null) }),
      fc.constant({}),
    );

    fc.assert(
      fc.property(mixedArb, (obj) => {
        const result = banBodySchema.safeParse(obj);

        const reason = (obj as Record<string, unknown>).reason;
        const isString = typeof reason === "string";
        const trimmedLen = isString ? (reason as string).trim().length : 0;
        const shouldPass = isString && trimmedLen >= 1 && trimmedLen <= 500;

        return result.success === shouldPass;
      }),
      { numRuns: 1000 },
    );
  });
});
