"use client";

import { useEffect } from "react";

type ChatBoxProps = {
  userId: string;
};

/**
 * Deprecated legacy chat surface.
 *
 * The old implementation connected the browser straight to Core BE via the
 * removed `/ws/chat/{userId}` endpoint. Keep a visible stub here so any future
 * accidental import fails safe instead of silently reviving the wrong protocol.
 */
export default function ChatBox({ userId }: ChatBoxProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[ChatBox] Deprecated for user ${userId}. Use the dashboard chat stack via /api/v1/conversations and useChat/useChatWs.`,
      );
    }
  }, [userId]);

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
      <div className="font-semibold">Deprecated chat component</div>
      <p className="mt-2 leading-6">
        `ChatBox` no longer opens a direct browser-to-Core WebSocket connection.
        Use the dashboard chat flow instead.
      </p>
    </div>
  );
}
