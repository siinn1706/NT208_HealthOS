import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveCoreWebSocketBase } from "@/lib/core-websocket-url";

describe("Next.js routing policy", () => {
  const source = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
  const devProxySource = readFileSync(path.join(process.cwd(), "tools/dev-proxy-server.mjs"), "utf8");
  const groupRouteSource = readFileSync(
    path.join(process.cwd(), "src/app/api/v1/conversations/group/route.ts"),
    "utf8",
  );
  const useChatConvWsSource = readFileSync(path.join(process.cwd(), "src/hooks/useChatConvWs.ts"), "utf8");
  const chatWindowSource = readFileSync(
    path.join(process.cwd(), "src/components/dashboard/chat/ChatWindow.tsx"),
    "utf8",
  );

  it("does not expose a production browser rewrite from /v1 to Core", () => {
    expect(source).not.toMatch(/source\s*:\s*["'`]\/v1\/:path\*/);
    expect(source).not.toMatch(/destination\s*:\s*["'`][^"'`]*\/v1\/:path\*/);
  });

  it("does not expose /ws as a Next.js rewrite to Core", () => {
    expect(source).not.toMatch(/source\s*:\s*["'`]\/ws(?:\/:path\*)?/);
  });

  it("keeps dev HTTP traffic on Next and proxies only WebSocket upgrades to Core", () => {
    expect(devProxySource).not.toContain("proxyHttp");
    expect(devProxySource).toContain("server.on(\"upgrade\"");
    expect(devProxySource).toContain("isCoreWebSocketProxyPath");
    expect(devProxySource).toContain("const nextUpgradeHandler = app.upgradeHandler");
    expect(devProxySource).not.toContain("server.listeners(\"upgrade\")");
  });

  it("binds the dev proxy to a tunnel-friendly host by default", () => {
    expect(devProxySource).toContain('process.env.HOSTNAME ?? "0.0.0.0"');
    expect(devProxySource).not.toContain('process.env.HOSTNAME ?? "localhost"');
  });

  it("normalizes Next-owned upgrade requests to localhost while preserving the listener host", () => {
    expect(devProxySource).toContain("const nextUpgradeHost = `localhost:${port}`");
    expect(devProxySource).toContain("const nextUpgradeOrigin = `http://${nextUpgradeHost}`");
    expect(devProxySource).toContain("req.headers.host = nextUpgradeHost");
    expect(devProxySource).toContain("req.headers.origin = nextUpgradeOrigin");
    expect(devProxySource).toContain("server.listen(port, hostname");
  });

  it("keeps the Core WebSocket proxy path narrow", () => {
    expect(devProxySource).toContain('pathname === "/ws" || pathname.startsWith("/v1/")');
  });

  it("maps group creation through the BFF route to Core /v1/conversations", () => {
    expect(groupRouteSource).toContain("coreProxy(req, \"/v1/conversations\", { method: \"POST\" })");
    expect(groupRouteSource).not.toContain("\"/v1/conversations/group\"");
  });

  it("uses short-lived websocket tickets for per-conversation chat sockets", () => {
    expect(useChatConvWsSource).toContain("/api/v1/auth/ws-token");
    expect(useChatConvWsSource).not.toContain("/api/v1/auth/ws-jwt");
  });

  it("keeps the chat window on one authoritative conversation socket", () => {
    expect(chatWindowSource).toContain("useChatConvWs({");
    expect(chatWindowSource).not.toContain("useChatWs({");
  });

  it("normalizes Core websocket bases for localhost and public tunnels", () => {
    expect(resolveCoreWebSocketBase("https://core.trycloudflare.com/", {
      protocol: "https:",
      host: "frontend.trycloudflare.com",
    })).toBe("wss://core.trycloudflare.com");

    expect(resolveCoreWebSocketBase("ws://localhost:8000/", {
      protocol: "https:",
      host: "frontend.trycloudflare.com",
    })).toBe("wss://frontend.trycloudflare.com");

    expect(resolveCoreWebSocketBase("localhost:8000", {
      protocol: "https:",
      host: "frontend.trycloudflare.com",
    })).toBe("wss://frontend.trycloudflare.com");

    expect(resolveCoreWebSocketBase(undefined, {
      protocol: "http:",
      host: "localhost:3000",
    })).toBe("ws://localhost:3000");
  });
});
