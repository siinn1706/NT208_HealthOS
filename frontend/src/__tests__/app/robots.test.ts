import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots metadata route", () => {
  it("allows crawling for the root path", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
      },
    });
  });
});
