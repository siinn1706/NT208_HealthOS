import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { IntlWrapper } from "@/__tests__/test-utils";
import { ExerciseSuggestionsWidget } from "@/components/dashboard/widgets/ExerciseSuggestionsWidget";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ExerciseSuggestionsWidget", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches exercise suggestions from the BFF after mount", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "ai-walk",
            type: "goal",
            icon: "Footprints",
            title: "Đi bộ nhẹ",
            message: "Đi bộ 20 phút sau bữa tối.",
            priority: 1,
            duration_minutes: 20,
            intensity: "medium",
            category: "cardio",
            source: "ai",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ExerciseSuggestionsWidget />, { wrapper: IntlWrapper });

    expect(screen.getByText("Đang tải gợi ý luyện tập...")).toBeInTheDocument();
    expect(await screen.findByText("Đi bộ nhẹ")).toBeInTheDocument();
    expect(screen.getByText("Đi bộ 20 phút sau bữa tối.")).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/dashboard/exercise-suggestions");
    expect(init.credentials).toBe("include");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps the widget renderable when the BFF request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ error: "failed" }, 503));
    vi.stubGlobal("fetch", fetchMock);

    render(<ExerciseSuggestionsWidget />, { wrapper: IntlWrapper });

    expect(await screen.findByText("Không tải được gợi ý luyện tập.")).toBeInTheDocument();
    expect(screen.getByText("Xem tiến độ")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when the BFF returns no suggestions", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ExerciseSuggestionsWidget />, { wrapper: IntlWrapper });

    expect(await screen.findByText("Ghi lại dữ liệu sức khỏe để nhận gợi ý luyện tập.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
