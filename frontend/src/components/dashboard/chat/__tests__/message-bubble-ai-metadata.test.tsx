import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlWrapper } from "@/__tests__/test-utils";
import { MessageBubble } from "../MessageBubble";
import type { Message } from "@/types/api";

const baseMessage: Message = {
  id: "msg-ai-1",
  conversation_id: "conv-ai",
  sender_id: "bot-1",
  sender_display_name: "HealthOS AI Assistant",
  sender_kind: "ai",
  content: "Ăn nhiều rau xanh.",
  type: "text",
  status: "read",
  reactions: [],
  is_edited: true,
  is_recalled: false,
  is_pinned: false,
  created_at: "2026-05-29T14:22:00Z",
  edited_at: "2026-05-29T14:23:00Z",
};

function renderBubble(message: Message, isAi: boolean) {
  render(
    <MessageBubble
      message={message}
      isOwn={false}
      isAi={isAi}
      currentUserId="user-1"
      participantNameById={{ "bot-1": "HealthOS AI Assistant" }}
      showAvatar
      showTime
      onReply={vi.fn()}
      onEdit={vi.fn()}
      onRecall={vi.fn()}
      onDelete={vi.fn()}
      onPin={vi.fn()}
      onReact={vi.fn()}
    />,
    { wrapper: IntlWrapper },
  );
}

describe("MessageBubble AI metadata", () => {
  it("shows the AI disclaimer instead of the edited label for edited AI replies", () => {
    renderBubble(baseMessage, true);

    expect(screen.getByText("Do AI tạo. Không phải tư vấn y khoa.")).toBeInTheDocument();
    expect(screen.queryByText("(Đã chỉnh sửa)")).not.toBeInTheDocument();
  });

  it("renders persisted AI markdown without raw markdown markers", () => {
    renderBubble(
      {
        ...baseMessage,
        content: "Giữ **thói quen** uống thuốc.",
      },
      true,
    );

    expect(screen.getByText("thói quen").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("keeps the edited label for non-AI edited messages", () => {
    renderBubble({ ...baseMessage, sender_kind: "user" }, false);

    expect(screen.getByText("(Đã chỉnh sửa)")).toBeInTheDocument();
    expect(screen.queryByText("Do AI tạo. Không phải tư vấn y khoa.")).not.toBeInTheDocument();
  });

  it("renders image attachments as previews", () => {
    renderBubble(
      {
        ...baseMessage,
        sender_kind: "user",
        content: "Ảnh bữa trưa",
        type: "image",
        attachments: [{
          url: "http://storage.local/chat/lunch.png",
          name: "lunch.png",
          size: 2048,
          mime_type: "image/png",
        }],
      },
      false,
    );

    expect(screen.getByAltText("lunch.png")).toHaveAttribute("src", "http://storage.local/chat/lunch.png");
    expect(screen.getByText("lunch.png")).toBeInTheDocument();
  });
});
