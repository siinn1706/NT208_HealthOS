import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bffFetch } from "@/lib/api-client";
import { UserPickerMulti } from "../UserPickerMulti";
import type { ChatParticipant } from "@/types/api";

vi.mock("@/lib/api-client", () => ({
  bffFetch: vi.fn(),
}));

const mockBffFetch = vi.mocked(bffFetch);

describe("UserPickerMulti", () => {
  beforeEach(() => {
    mockBffFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes chat user search results before adding a selected member", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    mockBffFetch.mockResolvedValueOnce({
      data: [
        {
          id: "user-1",
          display_name: "Alice Nguyen",
          email: "alice@example.com",
          avatar_url: null,
        },
      ],
    });

    render(<UserPickerMulti selected={[]} onChange={onChange} />);

    await user.type(screen.getByRole("textbox"), "alice");

    const resultName = await screen.findByText("Alice Nguyen");
    await user.click(resultName.closest("button")!);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "user-1",
        display_name: "Alice Nguyen",
        email: "alice@example.com",
      }),
    ]);
  });

  it("does not emit React key warnings when a selected member came from search", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    function ControlledPicker() {
      const [selected, setSelected] = useState<ChatParticipant[]>([]);
      return <UserPickerMulti selected={selected} onChange={setSelected} />;
    }

    mockBffFetch.mockResolvedValueOnce({
      data: [
        {
          id: "user-2",
          display_name: "Bao Tran",
          email: "bao@example.com",
          avatar_url: null,
        },
      ],
    });

    render(<ControlledPicker />);

    await user.type(screen.getByRole("textbox"), "bao");
    const resultName = await screen.findByText("Bao Tran");
    await user.click(resultName.closest("button")!);

    await waitFor(() => {
      expect(screen.getByLabelText("Remove Bao Tran")).toBeInTheDocument();
    });

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('unique "key" prop')),
      ),
    ).toBe(false);

    consoleError.mockRestore();
  });
});
