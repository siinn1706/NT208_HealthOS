import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompareColumn {
  id: string;
  /** Header label shown in the top row (e.g. plan name). */
  label: string;
  /** Optional caption under the label (e.g. "99k₫/mo"). */
  caption?: string;
  /** Highlights this column with the recommended ring + emphasis styling. */
  recommended?: boolean;
}

export interface CompareRow {
  id: string;
  /** Row label rendered in the leftmost cell. */
  label: string;
  /** Map of columnId → value. `true`/`false` render as Check/Minus icons,
   *  strings render verbatim (used for "Up to 5", "Unlimited" etc.). */
  values: Record<string, boolean | string>;
}

interface CompareTableProps {
  /** Visually-hidden table `<caption>` for screen-reader context. */
  caption?: string;
  /** Caption for the leftmost column header. */
  featureColumnLabel: string;
  /** A11y labels for the included/not-included icons. */
  includedLabel: string;
  notIncludedLabel: string;
  columns: CompareColumn[];
  rows: CompareRow[];
  className?: string;
}

/**
 * Side-by-side comparison table for plans.
 * - Pure server component; no client interactivity beyond CSS hover.
 * - Mobile: horizontally scrolls inside an `overflow-x-auto` wrapper so cell
 *   widths don't collapse and labels stay readable.
 * - Recommended column gets a subtle ring + slight bg tint to echo PlanCard.
 */
export function CompareTable({
  caption,
  featureColumnLabel,
  includedLabel,
  notIncludedLabel,
  columns,
  rows,
  className,
}: CompareTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th
              scope="col"
              className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {featureColumnLabel}
            </th>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  "p-4 text-left",
                  col.recommended && "bg-night-400/10"
                )}
              >
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-foreground">
                    {col.label}
                  </span>
                  {col.caption && (
                    <span className="mt-0.5 text-xs font-normal text-muted-foreground">
                      {col.caption}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-border last:border-b-0",
                i % 2 === 1 && "bg-muted/20"
              )}
            >
              <th
                scope="row"
                className="px-4 py-3 text-left font-medium text-foreground"
              >
                {row.label}
              </th>
              {columns.map((col) => {
                const v = row.values[col.id];
                return (
                  <td
                    key={col.id}
                    className={cn(
                      "px-4 py-3 align-middle text-foreground/80",
                      col.recommended && "bg-night-400/10"
                    )}
                  >
                    {typeof v === "string" ? (
                      <span>{v}</span>
                    ) : v ? (
                      <span className="inline-flex items-center gap-1.5 text-night-700 dark:text-night-300">
                        <Check className="size-4" aria-hidden="true" />
                        <span className="sr-only">{includedLabel}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/60">
                        <Minus className="size-4" aria-hidden="true" />
                        <span className="sr-only">{notIncludedLabel}</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
