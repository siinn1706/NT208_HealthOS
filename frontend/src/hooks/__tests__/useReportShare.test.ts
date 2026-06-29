/**
 * Tests for useReportShare.shareToContacts — verifies the request now carries
 * `period`, `locale` and recipient `phone`, and that an all-"skipped" response
 * surfaces an info toast (not a hard error).
 *
 * Run with `npm test` (vitest).
 */
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "sonner";
import { useReportShare } from "../useReportShare";
import type { HealthReport, ShareRecipient, ShareChannel } from "@/types/api";

const report = {
  id: "report-7d-x",
  period: "7d",
  status: "normal",
  alerts: [],
} as unknown as HealthReport;

const recipients: ShareRecipient[] = [
  { name: "Bob", email: "bob@example.com", phone: "+12025550123" },
];

function mockFetch(payload: unknown, ok = true): Mock {
  const fn = vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(payload) });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function bodyOf(fetchMock: Mock): Record<string, unknown> {
  return JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
}

describe("useReportShare.shareToContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("posts period, locale and recipient phone to the share endpoint", async () => {
    const fetchMock = mockFetch({
      data: [{ recipient: recipients[0], channel: "email", status: "sent" }],
    });

    const { result } = renderHook(() => useReportShare());
    await act(async () => {
      await result.current.shareToContacts(
        report,
        recipients,
        ["email", "sms"] as ShareChannel[],
        "ghi chú",
        "en",
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/reports/share",
      expect.objectContaining({ method: "POST" }),
    );
    const body = bodyOf(fetchMock);
    expect(body.period).toBe("7d");
    expect(body.locale).toBe("en");
    expect(body.include_pdf).toBe(true); // email is among the channels
    expect((body.recipients as ShareRecipient[])[0].phone).toBe("+12025550123");
    expect(toast.success as Mock).toHaveBeenCalled();
  });

  it("shows an info toast when every result is skipped", async () => {
    mockFetch({
      data: [{ recipient: recipients[0], channel: "sms", status: "skipped", error_message: "missing_phone" }],
    });

    const { result } = renderHook(() => useReportShare());
    await act(async () => {
      await result.current.shareToContacts(report, recipients, ["sms"] as ShareChannel[]);
    });

    expect(toast.info as Mock).toHaveBeenCalled();
    expect(toast.success as Mock).not.toHaveBeenCalled();
    expect(toast.error as Mock).not.toHaveBeenCalled();
  });

  it("defaults locale to vi when not provided", async () => {
    const fetchMock = mockFetch({
      data: [{ recipient: recipients[0], channel: "email", status: "sent" }],
    });

    const { result } = renderHook(() => useReportShare());
    await act(async () => {
      await result.current.shareToContacts(report, recipients, ["email"] as ShareChannel[]);
    });

    expect(bodyOf(fetchMock).locale).toBe("vi");
  });
});
