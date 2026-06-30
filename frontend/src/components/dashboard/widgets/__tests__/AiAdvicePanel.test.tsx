import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { IntlWrapper } from "@/__tests__/test-utils";
import { AiAdvicePanel } from "@/components/dashboard/widgets/AiAdvicePanel";

vi.mock("@/navigation", () => ({
  Link: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const advicePayload = {
  id: "ai-advice-1",
  status: "ready",
  category: "activity",
  priority: "medium",
  title: "Đi bộ nhẹ sau bữa ăn",
  body: "Bạn đã ghi nhiều calo và còn ít bước chân.",
  actions: [{ id: "walk", label: "Đi bộ nhẹ", type: "walk" }],
  evidence: [
    { metric: "Bước chân", value: 1200, unit: "steps", comparison: "< 5,000" },
    { metric: "Calo hôm nay", value: 2600, unit: "kcal", comparison: "> 2,200" },
  ],
  source: "ai",
  rag_sources: [],
  generated_at: "2026-06-30T12:00:00Z",
  expires_at: "2026-06-30T12:45:00Z",
  disclaimer: "Chỉ mang tính tham khảo.",
};

describe("AiAdvicePanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches dashboard advice after mount and unwraps DataResponse.data", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: advicePayload }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AiAdvicePanel />, { wrapper: IntlWrapper });

    expect(screen.getByText("AI đang phân tích")).toBeInTheDocument();
    expect(await screen.findByText("Đi bộ nhẹ sau bữa ăn")).toBeInTheDocument();
    expect(screen.getByText("Bạn đã ghi nhiều calo và còn ít bước chân.")).toBeInTheDocument();
    expect(screen.getByText(/Bước chân: 1200 steps/)).toBeInTheDocument();
    expect(screen.getByText("Đi bộ nhẹ")).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/dashboard/ai-advice?locale=vi&surface=web");
    expect(init.credentials).toBe("include");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("renders retry state on malformed envelopes and can retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { title: "missing fields" } }))
      .mockResolvedValueOnce(jsonResponse({ data: advicePayload }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AiAdvicePanel />, { wrapper: IntlWrapper });

    expect(await screen.findByText("Chưa tải được gợi ý AI")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Thử lại"));
    expect(await screen.findByText("Đi bộ nhẹ sau bữa ăn")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
