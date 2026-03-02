import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard({ rows = 2 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
      {/* Content */}
      <div className="px-5 py-5">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(rows, 2)}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: rows * 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* Page header skeleton */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* Profile header card skeleton */}
      <div className="rounded-xl border border-border bg-card px-6 py-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-4 w-56 rounded" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <div className="ml-auto">
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
      </div>

      {/* Section skeletons */}
      <SkeletonCard rows={2} />
      <SkeletonCard rows={1} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
    </div>
  );
}
