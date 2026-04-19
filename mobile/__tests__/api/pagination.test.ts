/**
 * Locks down the pagination helpers used by every infinite-list screen.
 * Verifies:
 *   - flattenPages dedupes by id (offset overlap, cursor overlap)
 *   - flattenPages preserves first-occurrence ordering
 *   - flattenPages handles undefined cleanly
 *   - offsetGetNextPageParam matches the backend `PaginatedResponse` math
 */
import { flattenPages, offsetGetNextPageParam } from "@/api/pagination";
import type { InfiniteData } from "@tanstack/react-query";

interface Row {
  id: string;
  value: number;
}

function pages(...lists: Row[][]): InfiniteData<{ data: Row[] }> {
  return {
    pages: lists.map((data) => ({ data })),
    pageParams: lists.map((_, i) => i),
  };
}

describe("flattenPages", () => {
  it("returns [] for undefined / no pages", () => {
    expect(flattenPages(undefined)).toEqual([]);
    expect(flattenPages(pages())).toEqual([]);
  });

  it("flattens rows in page order", () => {
    const out = flattenPages(
      pages(
        [{ id: "a", value: 1 }],
        [{ id: "b", value: 2 }, { id: "c", value: 3 }]
      )
    );
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("dedupes a row that appears at the boundary of two pages", () => {
    const boundary: Row = { id: "b", value: 2 };
    const out = flattenPages(
      pages(
        [{ id: "a", value: 1 }, boundary],
        [boundary, { id: "c", value: 3 }]
      )
    );
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the first occurrence of a duplicate (not the second)", () => {
    const out = flattenPages(
      pages(
        [{ id: "a", value: 1 }],
        [{ id: "a", value: 99 }, { id: "b", value: 2 }]
      )
    );
    expect(out).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 2 },
    ]);
  });
});

describe("offsetGetNextPageParam", () => {
  it("returns next page when there are more rows", () => {
    expect(
      offsetGetNextPageParam({ meta: { page: 1, per_page: 25, total: 100 } })
    ).toBe(2);
    expect(
      offsetGetNextPageParam({ meta: { page: 3, per_page: 25, total: 100 } })
    ).toBe(4);
  });

  it("returns undefined when the last page is full but no more rows exist", () => {
    expect(
      offsetGetNextPageParam({ meta: { page: 4, per_page: 25, total: 100 } })
    ).toBeUndefined();
  });

  it("returns undefined when total is 0", () => {
    expect(
      offsetGetNextPageParam({ meta: { page: 1, per_page: 25, total: 0 } })
    ).toBeUndefined();
  });

  it("handles a partial last page", () => {
    expect(
      offsetGetNextPageParam({ meta: { page: 4, per_page: 25, total: 87 } })
    ).toBeUndefined();
    expect(
      offsetGetNextPageParam({ meta: { page: 3, per_page: 25, total: 87 } })
    ).toBe(4);
  });
});

