import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const healthPagePath = "src/app/[locale]/(app)/dashboard/health/page.tsx";
const widgetPath = "src/components/dashboard/widgets/VitalsChartWidget.tsx";
const realtimeHookPath = "src/hooks/useVitalsRealtimeRefresh.ts";
const appShellPath = "src/components/dashboard/shell/AppShell.tsx";
const oldHookPath = "src/hooks/useRealtimeChartUpdates.ts";

function readSource(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function collectRuntimeHookSources(relativeDir: string): string[] {
  const fullDir = path.join(root, relativeDir);
  return readdirSync(fullDir).flatMap((entry) => {
    if (entry === "__tests__") return [];
    const fullPath = path.join(fullDir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return collectRuntimeHookSources(path.join(relativeDir, entry));
    }
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) return [];
    return [readFileSync(fullPath, "utf8")];
  });
}

describe("health vitals realtime source contract", () => {
  it("wires the refetch signal hook into health chart surfaces", () => {
    expect(readSource(healthPagePath)).toContain("useVitalsRealtimeRefresh");
    expect(readSource(widgetPath)).toContain("useVitalsRealtimeRefresh");
  });

  it("keeps vitals events on the shared dashboard websocket bridge", () => {
    const hookSource = readSource(realtimeHookPath);
    const appShellSource = readSource(appShellPath);

    expect(appShellSource).toContain("VITALS_REALTIME_EVENT");
    expect(appShellSource).toContain("vitals.updated");
    expect(hookSource).not.toContain("useHealthAlerts");
    expect(hookSource).not.toContain("useChatWs({");
  });

  it("keeps browser refresh fetches on BFF routes", () => {
    const touchedSources = [
      readSource(healthPagePath),
      readSource(widgetPath),
      readSource(realtimeHookPath),
    ].join("\n");

    expect(touchedSources).toContain("/api/v1/");
    expect(touchedSources).not.toMatch(/fetch\(\s*["'`]\/v1\//);
  });

  it("removes the stale pushed-chart-data hook contract from runtime hooks", () => {
    const staleEvent = ["metric", "update"].join("_");
    const hookSources = collectRuntimeHookSources("src/hooks").join("\n");

    expect(existsSync(path.join(root, oldHookPath))).toBe(false);
    expect(hookSources).not.toContain(staleEvent);
  });
});
