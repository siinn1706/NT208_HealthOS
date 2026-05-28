import { fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { bffFetch } from "@/lib/api-client";
import { UserPickerMulti } from "../UserPickerMulti";

vi.mock("@/lib/api-client", () => ({
  bffFetch: vi.fn(),
}));

describe("UserPickerMulti", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (bffFetch as Mock).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("normalizes Core user lookup ids before rendering and selecting results", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onChange = vi.fn();
    (bffFetch as Mock).mockResolvedValue({
      data: [
        {
          id: "user-1",
          display_name: "Alice Example",
          email: "alice@example.test",
          avatar_url: null,
        },
        {
          id: "user-2",
          display_name: "Bob Example",
          email: "bob@example.test",
          avatar_url: null,
        },
      ],
    });

    render(<UserPickerMulti selected={[]} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ali" } });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    const aliceName = screen.getByText("Alice Example");
    expect(aliceName).toBeInTheDocument();
    expect(screen.getByText("Bob Example")).toBeInTheDocument();
    expect(
      consoleError.mock.calls
        .flat()
        .map(String)
        .filter((message) => message.includes('unique "key" prop')),
    ).toHaveLength(0);

    const aliceButton = aliceName.closest("button");
    expect(aliceButton).not.toBeNull();
    fireEvent.click(aliceButton as HTMLButtonElement);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "user-1",
        display_name: "Alice Example",
      }),
    ]);
  });
});
