import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryDetailLoading() {
  return (
    <div className="space-y-6 pb-4">
      {/* Breadcrumb skeleton */}
      <Skeleton className="h-4 w-56 rounded" />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Chart */}
      <Skeleton className="h-80 rounded-xl" />

      {/* Table */}
      <Skeleton className="h-64 rounded-xl" />

      {/* Alerts */}
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
