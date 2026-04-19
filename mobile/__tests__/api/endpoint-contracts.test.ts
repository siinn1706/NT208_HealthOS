/**
 * Contract tests for every endpoint module — verifies that each function:
 *   - hits the EXACT backend path (matches `backend/app/api/v1/router.py`)
 *   - uses the correct HTTP method
 *   - encodes the right query parameters
 *
 * If a backend route ever moves (e.g. `/v1/users/me` → `/v2/users/me`) one of
 * these tests will fail loudly instead of users seeing silent 404s in production.
 */
import * as account from "@/api/endpoints/account";
import * as appointments from "@/api/endpoints/appointments";
import * as auth from "@/api/endpoints/auth";
import * as conversations from "@/api/endpoints/conversations";
import * as dashboard from "@/api/endpoints/dashboard";
import * as devices from "@/api/endpoints/devices";
import * as healthGoals from "@/api/endpoints/health-goals";
import * as healthInsights from "@/api/endpoints/health-insights";
import * as healthMetrics from "@/api/endpoints/health-metrics";
import * as meals from "@/api/endpoints/meals";
import * as mfa from "@/api/endpoints/mfa";
import * as nutrition from "@/api/endpoints/nutrition";
import * as preferences from "@/api/endpoints/preferences";
import * as reminders from "@/api/endpoints/reminders";
import * as reports from "@/api/endpoints/reports";
import * as securityLogs from "@/api/endpoints/security-logs";
import * as users from "@/api/endpoints/users";
import { sessionStore } from "@/auth/session";

const BASE = "http://10.0.2.2:8000";

interface Captured {
  method: string;
  path: string;
  fullUrl: string;
  query: Record<string, string>;
  body?: unknown;
}

let captured: Captured | null;
let fetchSpy: jest.SpyInstance;

function mockOk(body: unknown = { data: {} }): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(async () => {
  await sessionStore.getState().setToken("test-token");
  captured = null;
  fetchSpy = jest.spyOn(global, "fetch" as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fetchSpy as any).mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      const u = new URL(url);
      captured = {
        method: init?.method ?? "GET",
        path: u.pathname,
        fullUrl: url,
        query: Object.fromEntries(u.searchParams.entries()),
        body: init?.body
          ? init.body instanceof FormData
            ? "<FormData>"
            : (() => {
                try {
                  return JSON.parse(String(init.body));
                } catch {
                  return init.body;
                }
              })()
          : undefined,
      };
      return mockOk({ data: {} });
    }
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function expectCall(method: string, path: string, opts: { query?: Record<string, string>; body?: unknown } = {}) {
  expect(captured).not.toBeNull();
  expect(captured!.method).toBe(method);
  expect(captured!.path).toBe(path);
  expect(captured!.fullUrl.startsWith(BASE)).toBe(true);
  if (opts.query) expect(captured!.query).toEqual(opts.query);
  if (opts.body !== undefined) expect(captured!.body).toEqual(opts.body);
}

describe("auth endpoints", () => {
  it("login → POST /v1/auth/login", async () => {
    await auth.login({ identifier: "u", password: "p" });
    expectCall("POST", "/v1/auth/login", { body: { identifier: "u", password: "p" } });
  });

  it("logout → POST /v1/auth/logout", async () => {
    await auth.logout();
    expectCall("POST", "/v1/auth/logout");
  });

  it("requestOtp → POST /v1/auth/request-otp", async () => {
    await auth.requestOtp({ email: "a@b.c", purpose: "login" });
    expectCall("POST", "/v1/auth/request-otp");
  });

  it("verifyOtp → POST /v1/auth/verify-otp", async () => {
    await auth.verifyOtp({ email: "a@b.c", purpose: "login", code: "123456" });
    expectCall("POST", "/v1/auth/verify-otp");
  });

  it("resetPassword → POST /v1/auth/reset-password", async () => {
    await auth.resetPassword({ email: "a@b.c", new_password: "newpw" });
    expectCall("POST", "/v1/auth/reset-password");
  });

  it("checkUsername → GET /v1/auth/check-username with q", async () => {
    await auth.checkUsername("alice");
    expectCall("GET", "/v1/auth/check-username", { query: { username: "alice" } });
  });

  it("checkEmail → GET /v1/auth/check-email", async () => {
    await auth.checkEmail("a@b.c");
    expectCall("GET", "/v1/auth/check-email", { query: { email: "a@b.c" } });
  });

  it("checkPasswordBreach → POST /v1/auth/check-password-breach", async () => {
    await auth.checkPasswordBreach("hunter2");
    expectCall("POST", "/v1/auth/check-password-breach", { body: { password: "hunter2" } });
  });

  it("fetchAuthMe → GET /v1/auth/me", async () => {
    await auth.fetchAuthMe();
    expectCall("GET", "/v1/auth/me");
  });

  it("fetchWsTicket → GET /v1/auth/ws-ticket", async () => {
    await auth.fetchWsTicket();
    expectCall("GET", "/v1/auth/ws-ticket");
  });
});

describe("users endpoints", () => {
  it("fetchCurrentUser → GET /v1/users/me", async () => {
    await users.fetchCurrentUser();
    expectCall("GET", "/v1/users/me");
  });

  it("patchCurrentUser → PATCH /v1/users/me", async () => {
    await users.patchCurrentUser({ full_name: "X", onboarding_completed: true });
    expectCall("PATCH", "/v1/users/me", {
      body: { full_name: "X", onboarding_completed: true },
    });
  });

  it("lookupUsers → GET /v1/users/lookup", async () => {
    await users.lookupUsers("ali", 20);
    expectCall("GET", "/v1/users/lookup", { query: { q: "ali", limit: "20" } });
  });
});

describe("preferences + mfa + security log endpoints", () => {
  it("fetchPreferences → GET /v1/preferences/me", async () => {
    await preferences.fetchPreferences();
    expectCall("GET", "/v1/preferences/me");
  });

  it("patchPreferences → PATCH /v1/preferences/me", async () => {
    await preferences.patchPreferences({ theme_mode: "dark", accent_color: "#000" });
    expectCall("PATCH", "/v1/preferences/me", {
      body: { theme_mode: "dark", accent_color: "#000" },
    });
  });

  it("fetchMfaStatus → GET /v1/mfa/status", async () => {
    await mfa.fetchMfaStatus();
    expectCall("GET", "/v1/mfa/status");
  });

  it("setupMfa → POST /v1/mfa/setup", async () => {
    await mfa.setupMfa();
    expectCall("POST", "/v1/mfa/setup");
  });

  it("verifySetup → POST /v1/mfa/verify-setup", async () => {
    await mfa.verifySetup("123456");
    expectCall("POST", "/v1/mfa/verify-setup", { body: { code: "123456" } });
  });

  it("verifyMfa → POST /v1/mfa/verify", async () => {
    await mfa.verifyMfa("123456");
    expectCall("POST", "/v1/mfa/verify");
  });

  it("disableMfa → POST /v1/mfa/disable", async () => {
    await mfa.disableMfa("123456");
    expectCall("POST", "/v1/mfa/disable");
  });

  it("regenerateRecoveryCodes → POST /v1/mfa/regenerate-recovery-codes", async () => {
    await mfa.regenerateRecoveryCodes("123456");
    expectCall("POST", "/v1/mfa/regenerate-recovery-codes");
  });

  it("fetchSecurityLogs → GET /v1/security-logs/ (trailing slash matters)", async () => {
    await securityLogs.fetchSecurityLogs({ limit: 25 });
    expectCall("GET", "/v1/security-logs/", { query: { limit: "25" } });
  });
});

describe("dashboard / vitals / health-metrics / health-insights", () => {
  it("fetchDashboardSummary → GET /v1/dashboard/summary", async () => {
    await dashboard.fetchDashboardSummary();
    expectCall("GET", "/v1/dashboard/summary");
  });

  it("listHealthMetrics → GET /v1/health-metrics with paging", async () => {
    await healthMetrics.listHealthMetrics({ metric_type: "heart_rate", page: 2, per_page: 50 });
    expectCall("GET", "/v1/health-metrics", {
      query: { metric_type: "heart_rate", page: "2", per_page: "50" },
    });
  });

  it("createHealthMetric → POST /v1/health-metrics", async () => {
    await healthMetrics.createHealthMetric({
      metric_type: "heart_rate",
      value: 80,
      unit: "bpm",
      recorded_at: "2026-04-19T10:00:00Z",
    });
    expectCall("POST", "/v1/health-metrics");
  });

  it("fetchAggregated → GET /v1/health-metrics/aggregated", async () => {
    await healthMetrics.fetchAggregated({ metric_type: "heart_rate", period: "weekly" });
    expectCall("GET", "/v1/health-metrics/aggregated", {
      query: { metric_type: "heart_rate", period: "weekly" },
    });
  });

  it("compareMetrics → GET /v1/health-metrics/compare with comma list", async () => {
    await healthMetrics.compareMetrics({
      metrics: ["heart_rate", "steps"],
      period: "30d",
    });
    expectCall("GET", "/v1/health-metrics/compare", {
      query: { metrics: "heart_rate,steps", period: "30d" },
    });
  });

  it("comparePeriods → GET /v1/health-metrics/compare-periods", async () => {
    await healthMetrics.comparePeriods({ metric: "weight_kg", period: "90d" });
    expectCall("GET", "/v1/health-metrics/compare-periods", {
      query: { metric: "weight_kg", period: "90d" },
    });
  });

  it("fetchRiskSummary → GET /v1/health/risk-predictions", async () => {
    await healthInsights.fetchRiskSummary();
    expectCall("GET", "/v1/health/risk-predictions");
  });
});

describe("health-goals + goals.progress", () => {
  it("fetchHealthGoal → GET /v1/health-goals", async () => {
    await healthGoals.fetchHealthGoal();
    expectCall("GET", "/v1/health-goals");
  });

  it("createHealthGoal → POST /v1/health-goals", async () => {
    await healthGoals.createHealthGoal({ target_weight_kg: 70 });
    expectCall("POST", "/v1/health-goals");
  });

  it("updateHealthGoal → PATCH /v1/health-goals/{id}", async () => {
    await healthGoals.updateHealthGoal("goal-uuid", { target_weight_kg: 65 });
    expectCall("PATCH", "/v1/health-goals/goal-uuid");
  });

  it("deleteHealthGoal → DELETE /v1/health-goals/{id}", async () => {
    await healthGoals.deleteHealthGoal("goal-uuid");
    expectCall("DELETE", "/v1/health-goals/goal-uuid");
  });

  it("fetchGoalProgress → GET /v1/goals/progress", async () => {
    await healthGoals.fetchGoalProgress({ metric: "weight_kg", target: 70, period: "30d" });
    expectCall("GET", "/v1/goals/progress", {
      query: { metric: "weight_kg", target: "70", period: "30d" },
    });
  });
});

describe("reports + nutrition", () => {
  it("fetchReport → GET /v1/reports", async () => {
    await reports.fetchReport("90d");
    expectCall("GET", "/v1/reports", { query: { period: "90d" } });
  });

  it("fetchTrend → GET /v1/reports/trends", async () => {
    await reports.fetchTrend({ metric: "heart_rate", period: "30d" });
    expectCall("GET", "/v1/reports/trends", {
      query: { metric: "heart_rate", period: "30d" },
    });
  });

  it("requestReportPdf → POST /v1/reports/export-pdf", async () => {
    await reports.requestReportPdf({
      period: "30d",
      sections: ["summary", "vitals"],
    });
    expectCall("POST", "/v1/reports/export-pdf");
  });

  it("getReportPdfStatus → GET /v1/reports/export-pdf/{id}", async () => {
    await reports.getReportPdfStatus("req-uuid");
    expectCall("GET", "/v1/reports/export-pdf/req-uuid");
  });

  it("getReportPdfDownload → GET /v1/reports/export-pdf/{id}/download", async () => {
    await reports.getReportPdfDownload("req-uuid");
    expectCall("GET", "/v1/reports/export-pdf/req-uuid/download");
  });

  it("fetchNutritionSuggestions → GET /v1/nutrition/suggestions", async () => {
    await nutrition.fetchNutritionSuggestions();
    expectCall("GET", "/v1/nutrition/suggestions");
  });
});

describe("devices", () => {
  it("listDevices → GET /v1/devices", async () => {
    await devices.listDevices();
    expectCall("GET", "/v1/devices");
  });

  it("connectDevice → POST /v1/devices", async () => {
    await devices.connectDevice({ provider: "apple_health" });
    expectCall("POST", "/v1/devices", { body: { provider: "apple_health" } });
  });

  it("syncDevice → POST /v1/devices/{id}/sync", async () => {
    await devices.syncDevice("dev-uuid");
    expectCall("POST", "/v1/devices/dev-uuid/sync");
  });

  it("disconnectDevice → DELETE /v1/devices/{id}", async () => {
    await devices.disconnectDevice("dev-uuid");
    expectCall("DELETE", "/v1/devices/dev-uuid");
  });
});

describe("appointments", () => {
  it("listAppointments → GET /v1/appointments", async () => {
    await appointments.listAppointments({ page: 2 });
    expectCall("GET", "/v1/appointments", { query: { page: "2" } });
  });

  it("createAppointment → POST /v1/appointments", async () => {
    await appointments.createAppointment({
      appointment_date: "2026-05-01T10:00:00Z",
      doctor_name: "Dr. House",
    });
    expectCall("POST", "/v1/appointments");
  });

  it("updateAppointmentStatus → PATCH /v1/appointments/{id}/status", async () => {
    await appointments.updateAppointmentStatus("appt-uuid", "cancelled");
    expectCall("PATCH", "/v1/appointments/appt-uuid/status", {
      body: { status: "cancelled" },
    });
  });
});

describe("reminders (basic + occurrence model)", () => {
  it("fetchReminders → GET /v1/reminders", async () => {
    await reminders.fetchReminders("medicine");
    expectCall("GET", "/v1/reminders", { query: { type: "medicine" } });
  });

  it("fetchUpcomingReminders → GET /v1/reminders/upcoming", async () => {
    await reminders.fetchUpcomingReminders();
    expectCall("GET", "/v1/reminders/upcoming");
  });

  it("createReminder → POST /v1/reminders", async () => {
    await reminders.createReminder({
      type: "medicine",
      title: "Aspirin",
      time: "08:00",
      repeat: "daily",
    });
    expectCall("POST", "/v1/reminders");
  });

  it("updateReminderDone → PATCH /v1/reminders/{id}", async () => {
    await reminders.updateReminderDone("rem-uuid", true);
    expectCall("PATCH", "/v1/reminders/rem-uuid", { body: { done: true } });
  });

  it("deleteReminder → DELETE /v1/reminders/{id}", async () => {
    await reminders.deleteReminder("rem-uuid");
    expectCall("DELETE", "/v1/reminders/rem-uuid");
  });

  it("fetchReminderOccurrences → GET /v1/reminders/occurrences", async () => {
    await reminders.fetchReminderOccurrences({ today: true });
    expectCall("GET", "/v1/reminders/occurrences", { query: { today: "true" } });
  });

  it("snoozeReminder → POST /v1/reminders/{id}/snooze", async () => {
    await reminders.snoozeReminder("rem-uuid", { minutes: 10 });
    expectCall("POST", "/v1/reminders/rem-uuid/snooze", { body: { minutes: 10 } });
  });

  it("skipReminder → POST /v1/reminders/{id}/skip", async () => {
    await reminders.skipReminder("rem-uuid");
    expectCall("POST", "/v1/reminders/rem-uuid/skip");
  });

  it("markOccurrenceDone → POST /v1/reminders/{id}/done", async () => {
    await reminders.markOccurrenceDone("rem-uuid", "occ-uuid");
    expectCall("POST", "/v1/reminders/rem-uuid/done", {
      body: { occurrence_id: "occ-uuid" },
    });
  });
});

describe("meals", () => {
  it("listMeals → GET /v1/meals", async () => {
    await meals.listMeals({ page: 1, per_page: 25 });
    expectCall("GET", "/v1/meals", { query: { page: "1", per_page: "25" } });
  });

  it("getMeal → GET /v1/meals/{id}", async () => {
    await meals.getMeal("meal-uuid");
    expectCall("GET", "/v1/meals/meal-uuid");
  });

  it("createMealJson → POST /v1/meals", async () => {
    await meals.createMealJson({ name: "Lunch" });
    expectCall("POST", "/v1/meals", { body: { name: "Lunch" } });
  });

  it("getAnalysisStatus → GET /v1/meals/{id}/analysis-status", async () => {
    await meals.getAnalysisStatus("meal-uuid");
    expectCall("GET", "/v1/meals/meal-uuid/analysis-status");
  });

  it("fetchCaloriesSummary → GET /v1/meals/calories-summary", async () => {
    await meals.fetchCaloriesSummary({
      date_from: "2026-04-19T00:00:00Z",
      date_to: "2026-04-19T23:59:59Z",
    });
    expectCall("GET", "/v1/meals/calories-summary", {
      query: {
        date_from: "2026-04-19T00:00:00Z",
        date_to: "2026-04-19T23:59:59Z",
      },
    });
  });
});

describe("conversations", () => {
  it("listConversations → GET /v1/conversations", async () => {
    await conversations.listConversations();
    expectCall("GET", "/v1/conversations");
  });

  it("listPendingConversations → GET /v1/conversations/pending", async () => {
    await conversations.listPendingConversations();
    expectCall("GET", "/v1/conversations/pending");
  });

  it("getConversation → GET /v1/conversations/{id}", async () => {
    await conversations.getConversation("conv-uuid");
    expectCall("GET", "/v1/conversations/conv-uuid");
  });

  it("createDirectConversation → POST /v1/conversations/direct", async () => {
    await conversations.createDirectConversation("user-uuid");
    expectCall("POST", "/v1/conversations/direct", {
      body: { target_user_id: "user-uuid" },
    });
  });

  it("createGroupConversation → POST /v1/conversations", async () => {
    await conversations.createGroupConversation({
      title: "Family",
      member_ids: ["u1", "u2"],
    });
    expectCall("POST", "/v1/conversations");
  });

  it("acceptConversation → POST /v1/conversations/{id}/accept", async () => {
    await conversations.acceptConversation("conv-uuid");
    expectCall("POST", "/v1/conversations/conv-uuid/accept");
  });

  it("rejectConversation → POST /v1/conversations/{id}/reject", async () => {
    await conversations.rejectConversation("conv-uuid");
    expectCall("POST", "/v1/conversations/conv-uuid/reject");
  });

  it("listMessages → GET /v1/conversations/{id}/messages with cursor", async () => {
    await conversations.listMessages("conv-uuid", { before: "2026-04-19T10:00:00Z", limit: 50 });
    expectCall("GET", "/v1/conversations/conv-uuid/messages", {
      query: { before: "2026-04-19T10:00:00Z", limit: "50" },
    });
  });

  it("sendMessage → POST /v1/conversations/{id}/messages", async () => {
    await conversations.sendMessage("conv-uuid", { content: "hi", client_message_id: "tmp-1" });
    expectCall("POST", "/v1/conversations/conv-uuid/messages");
  });

  it("editMessage → PATCH /v1/conversations/{cid}/messages/{mid}", async () => {
    await conversations.editMessage("conv-uuid", "msg-uuid", "edited");
    expectCall("PATCH", "/v1/conversations/conv-uuid/messages/msg-uuid", {
      body: { content: "edited" },
    });
  });

  it("deleteMessage → DELETE with for_everyone query", async () => {
    await conversations.deleteMessage("conv-uuid", "msg-uuid", true);
    expectCall("DELETE", "/v1/conversations/conv-uuid/messages/msg-uuid", {
      query: { for_everyone: "true" },
    });
  });

  it("reactToMessage → POST .../reactions", async () => {
    await conversations.reactToMessage("conv-uuid", "msg-uuid", "👍");
    expectCall("POST", "/v1/conversations/conv-uuid/messages/msg-uuid/reactions");
  });

  it("listPinned → GET .../pinned", async () => {
    await conversations.listPinned("conv-uuid");
    expectCall("GET", "/v1/conversations/conv-uuid/pinned");
  });

  it("pinMessage → POST .../pinned/{mid}", async () => {
    await conversations.pinMessage("conv-uuid", "msg-uuid");
    expectCall("POST", "/v1/conversations/conv-uuid/pinned/msg-uuid");
  });

  it("unpinMessage → DELETE .../pinned/{mid}", async () => {
    await conversations.unpinMessage("conv-uuid", "msg-uuid");
    expectCall("DELETE", "/v1/conversations/conv-uuid/pinned/msg-uuid");
  });

  it("markRead → POST /v1/conversations/{id}/read", async () => {
    await conversations.markRead("conv-uuid", "msg-uuid");
    expectCall("POST", "/v1/conversations/conv-uuid/read", {
      body: { last_read_message_id: "msg-uuid" },
    });
  });
});

describe("account export + delete + restore", () => {
  it("requestDataExport → POST /v1/users/me/export", async () => {
    await account.requestDataExport();
    expectCall("POST", "/v1/users/me/export");
  });

  it("getDataExportStatus → GET /v1/users/me/export/{id}", async () => {
    await account.getDataExportStatus("req-uuid");
    expectCall("GET", "/v1/users/me/export/req-uuid");
  });

  it("getDataExportDownload → GET /v1/users/me/export/{id}/download", async () => {
    await account.getDataExportDownload("req-uuid");
    expectCall("GET", "/v1/users/me/export/req-uuid/download");
  });

  it("deleteAccount → DELETE /v1/users/me", async () => {
    await account.deleteAccount({ confirmation_email: "a@b.c", password: "p" });
    expectCall("DELETE", "/v1/users/me", {
      body: { confirmation_email: "a@b.c", password: "p" },
    });
  });

  it("restoreAccount → POST /v1/users/me/restore", async () => {
    await account.restoreAccount();
    expectCall("POST", "/v1/users/me/restore");
  });
});
