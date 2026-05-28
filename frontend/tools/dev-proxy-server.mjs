#!/usr/bin/env node
import { createServer } from "node:http";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import next from "next";

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CORE_API_URL = "http://localhost:8000";

function readCliValue(name, fallback) {
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0 && process.argv[exactIndex + 1]) {
    return process.argv[exactIndex + 1];
  }

  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function getListenOptions() {
  const port = Number.parseInt(readCliValue("port", process.env.PORT ?? "3000"), 10);
  const hostname = readCliValue("hostname", process.env.HOSTNAME ?? "0.0.0.0");
  return { hostname, port: Number.isFinite(port) ? port : 3000 };
}

function getCoreApiUrl() {
  try {
    return new URL(process.env.CORE_API_URL ?? DEFAULT_CORE_API_URL);
  } catch {
    return new URL(DEFAULT_CORE_API_URL);
  }
}

function isCoreWebSocketProxyPath(reqUrl) {
  if (!reqUrl) return false;
  const { pathname } = new URL(reqUrl, "http://localhost");
  return pathname === "/ws" || pathname.startsWith("/v1/");
}

function buildTargetUrl(reqUrl, coreApiUrl) {
  return new URL(reqUrl ?? "/", coreApiUrl);
}

function writeUpgradeRequest(req, upstream, target) {
  const headers = {
    ...req.headers,
    host: target.host,
  };
  const pathWithSearch = `${target.pathname}${target.search}`;
  const lines = [`${req.method ?? "GET"} ${pathWithSearch} HTTP/${req.httpVersion}`];

  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) lines.push(`${name}: ${item}`);
    } else if (value !== undefined) {
      lines.push(`${name}: ${value}`);
    }
  }

  upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
}

function proxyWebSocket(req, socket, head, coreApiUrl) {
  const target = buildTargetUrl(req.url, coreApiUrl);
  const isTls = target.protocol === "https:";
  const port = Number(target.port || (isTls ? 443 : 80));
  const connect = isTls ? tls.connect : net.connect;

  const upstream = connect(
    {
      host: target.hostname,
      port,
      servername: isTls ? target.hostname : undefined,
    },
    () => {
      writeUpgradeRequest(req, upstream, target);
      if (head.length > 0) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    },
  );

  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}

const { hostname, port } = getListenOptions();
const nextUpgradeHost = `localhost:${port}`;
const nextUpgradeOrigin = `http://${nextUpgradeHost}`;
const dev = process.env.NODE_ENV !== "production";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(FRONTEND_ROOT, dev);
const coreApiUrl = getCoreApiUrl();
let handleRequest;

const server = createServer((req, res) => {
  handleRequest(req, res);
});

const nextNoopHttpServer = {
  on() {
    return this;
  },
};

const app = next({
  dev,
  dir: FRONTEND_ROOT,
  hostname,
  port,
  // The dev proxy owns upgrade routing so Core WebSocket paths can be
  // forwarded before Next handles HMR. Supplying a no-op server prevents
  // Next's request handler from lazily adding a second upgrade listener.
  httpServer: nextNoopHttpServer,
  turbopack: true,
});

handleRequest = app.getRequestHandler();

await app.prepare();

const nextUpgradeHandler = app.upgradeHandler;
server.removeAllListeners("upgrade");
server.on("upgrade", (req, socket, head) => {
  if (isCoreWebSocketProxyPath(req.url)) {
    proxyWebSocket(req, socket, head, coreApiUrl);
    return;
  }

  if (typeof nextUpgradeHandler !== "function") {
    socket.destroy();
    return;
  }

  // Rewrite Host/Origin so Next.js HMR upgrades survive tunnel hostname churn.
  // Cloudflared forwards the tunnel host/origin; Next.js can close the dev
  // websocket unless that exact temporary domain was allowed before startup.
  // This only affects Next-owned upgrades that already reached this local dev
  // server; Core chat websocket upgrades are handled above.
  req.headers.host = nextUpgradeHost;
  req.headers.origin = nextUpgradeOrigin;

  nextUpgradeHandler(req, socket, head);
});

server.listen(port, hostname, () => {
  console.log(`> HealthOS frontend ready on http://${hostname}:${port} (local: http://localhost:${port})`);
  console.log(`> Core WS proxy target: ${coreApiUrl.origin}`);
});
