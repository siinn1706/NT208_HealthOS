import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardPagePath = path.join(
  process.cwd(),
  "src/app/[locale]/(app)/dashboard/page.tsx",
);

describe("dashboard performance regression guards", () => {
  it("does not server-fetch exercise suggestions during Dashboard SSR", () => {
    const source = readFileSync(dashboardPagePath, "utf8");

    expect(source).toContain("<ExerciseSuggestionsWidget");
    expect(source).not.toMatch(/getExerciseSuggestions|exercise-suggestions/);
  });
});
