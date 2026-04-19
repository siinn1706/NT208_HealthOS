import type { InfiniteData } from "@tanstack/react-query";

/**
 * Flatten + dedupe pages from a `useInfiniteQuery`. Rows are kept in the
 * order they first appear; duplicates (matched by `id`) are dropped.
 *
 * Why dedupe?
 *   - **Offset pagination**: when a new row is inserted between page fetches
 *     (e.g. user adds a meal while paging), the boundary row can appear on
 *     both pages. Without dedup the list shows the same item twice with
 *     duplicate React keys, which warns + breaks list virtualization.
 *   - **Cursor pagination**: messages keyed by `before=<ISO timestamp>` can
 *     overlap when two messages share the same `created_at` (high-throughput
 *     chat).
 *
 * Type guard: each page is expected to expose a `data: T[]` array. This
 * matches the shape every Core BE list endpoint returns
 * (`PaginatedResponse[T]`).
 */
export function flattenPages<T extends { id: string }>(
  data: InfiniteData<{ data: T[] }> | undefined
): T[] {
  if (!data) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const page of data.pages) {
    for (const row of page.data) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

/**
 * Standard "stop when total reached" predicate for offset-paginated lists
 * matching the Core BE PaginatedResponse meta shape.
 *
 * Returns `page + 1` if there are more rows to fetch, `undefined` to stop.
 */
export function offsetGetNextPageParam(last: {
  meta: { page: number; per_page: number; total: number };
}): number | undefined {
  const { page, per_page, total } = last.meta;
  return page * per_page < total ? page + 1 : undefined;
}
