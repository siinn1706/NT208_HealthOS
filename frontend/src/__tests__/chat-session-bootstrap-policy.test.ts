import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("chat session bootstrap policy", () => {
  const chatRouteLayoutSource = readFileSync(
    path.join(process.cwd(), "src/app/[locale]/(app)/dashboard/chat/layout.tsx"),
    "utf8",
  );
  const chatLayoutSource = readFileSync(
    path.join(process.cwd(), "src/components/dashboard/chat/ChatLayout.tsx"),
    "utf8",
  );

  it("passes a server-validated current user id into the chat client", () => {
    expect(chatRouteLayoutSource).toContain("await cookies()");
    expect(chatRouteLayoutSource).toContain('fetch(`${appUrl}/api/v1/auth/session`');
    expect(chatRouteLayoutSource).toContain("headers: { cookie: cookieStore.toString() }");
    expect(chatRouteLayoutSource).toContain("<ChatLayout initialCurrentUserId={initialCurrentUserId} />");
  });

  it("keeps the chat composer unlocked when a transient client session refresh fails", () => {
    expect(chatLayoutSource).toContain("initialCurrentUserId?: string | null");
    expect(chatLayoutSource).toContain("useState<string | null>(initialCurrentUserId)");
    expect(chatLayoutSource).toContain('credentials: "same-origin"');
    expect(chatLayoutSource).not.toContain("setCurrentUserId(null)");
  });
});
