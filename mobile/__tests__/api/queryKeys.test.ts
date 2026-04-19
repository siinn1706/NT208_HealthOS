/**
 * Locks down the query-key factory contract:
 *   - every key starts with one of the documented namespace prefixes
 *   - related keys nest under the same prefix so a single
 *     `qc.invalidateQueries({ queryKey: keys.foo.all })` clears every foo
 *     query at once (TanStack matches by prefix)
 *   - filter args are stable enough that reference-equal calls produce
 *     reference-equal keys (avoids unintentional refetch storms)
 */
import { listAllKeyPrefixes, queryKeys } from "@/api/queryKeys";

describe("query key factory", () => {
  it("declares the documented set of top-level prefixes", () => {
    expect(listAllKeyPrefixes()).toContain("auth");
    expect(listAllKeyPrefixes()).toContain("conversations");
    expect(listAllKeyPrefixes()).toContain("reminders");
    expect(listAllKeyPrefixes()).toContain("appointments");
  });

  it("every keyspace's `.all` key matches its namespace", () => {
    const cases: Array<[readonly unknown[], string]> = [
      [queryKeys.auth.all, "auth"],
      [queryKeys.user.all, "user"],
      [queryKeys.preferences.all, "preferences"],
      [queryKeys.mfa.all, "mfa"],
      [queryKeys.securityLogs.all, "security-logs"],
      [queryKeys.dashboard.all, "dashboard"],
      [queryKeys.vitals.all, "vitals"],
      [queryKeys.healthMetrics.all, "health-metrics"],
      [queryKeys.healthInsights.all, "health-insights"],
      [queryKeys.healthGoal.all, "health-goal"],
      [queryKeys.reports.all, "reports"],
      [queryKeys.nutrition.all, "nutrition"],
      [queryKeys.devices.all, "devices"],
      [queryKeys.appointments.all, "appointments"],
      [queryKeys.reminders.all, "reminders"],
      [queryKeys.meals.all, "meals"],
      [queryKeys.conversations.all, "conversations"],
      [queryKeys.account.all, "account"],
    ];
    for (const [key, prefix] of cases) {
      expect(key[0]).toBe(prefix);
      expect(key.length).toBe(1);
    }
  });

  it("nested keys begin with their namespace prefix (so .all invalidates them)", () => {
    expect(queryKeys.reminders.list()[0]).toBe("reminders");
    expect(queryKeys.reminders.upcoming()[0]).toBe("reminders");
    expect(queryKeys.reminders.occurrences()[0]).toBe("reminders");

    expect(queryKeys.conversations.list()[0]).toBe("conversations");
    expect(queryKeys.conversations.pending()[0]).toBe("conversations");
    expect(queryKeys.conversations.detail("c1")[0]).toBe("conversations");
    expect(queryKeys.conversations.messages("c1")[0]).toBe("conversations");
    expect(queryKeys.conversations.pinned("c1")[0]).toBe("conversations");

    expect(queryKeys.healthMetrics.list("heart_rate")[0]).toBe("health-metrics");
    expect(queryKeys.healthMetrics.aggregated("heart_rate", "daily")[0]).toBe(
      "health-metrics"
    );
    expect(
      queryKeys.healthMetrics.compare(["heart_rate", "steps"], "30d")[0]
    ).toBe("health-metrics");
    expect(queryKeys.healthMetrics.comparePeriods("weight_kg", "90d")[0]).toBe(
      "health-metrics"
    );

    expect(queryKeys.meals.list()[0]).toBe("meals");
    expect(queryKeys.meals.detail("m1")[0]).toBe("meals");
    expect(
      queryKeys.meals.caloriesSummary({ from: "2026-04-19", to: "2026-04-19" })[0]
    ).toBe("meals");
  });

  it("compare() flattens metric arrays so identical content => identical keys", () => {
    const a = queryKeys.healthMetrics.compare(["heart_rate", "steps"], "7d");
    const b = queryKeys.healthMetrics.compare(["heart_rate", "steps"], "7d");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("reminders.list() with and without filter produce different keys", () => {
    expect(JSON.stringify(queryKeys.reminders.list())).not.toBe(
      JSON.stringify(queryKeys.reminders.list("medicine"))
    );
  });

  it("user.lookup() debounce key includes both query and limit", () => {
    expect(JSON.stringify(queryKeys.user.lookup("ali"))).not.toBe(
      JSON.stringify(queryKeys.user.lookup("ali", 20))
    );
  });

  it("conversations sub-keys carry the conversation id at index 1", () => {
    const cid = "conv-uuid";
    expect(queryKeys.conversations.messages(cid)[1]).toBe(cid);
    expect(queryKeys.conversations.pinned(cid)[1]).toBe(cid);
    expect(queryKeys.conversations.detail(cid)[2]).toBe(cid);
  });
});
