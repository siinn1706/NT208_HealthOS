import { Suspense } from "react";
import { ProgressPageClient } from "@/components/dashboard/progress/ProgressPageClient";
import { getUserBmiData } from "@/lib/gamification-data";
import { getAggregatedMetrics } from "@/lib/analytics-data";

function Skeleton() {
  return <div className="animate-pulse rounded-xl bg-muted h-64" />;
}

interface BmiProgressPageProps {
  searchParams: Promise<{ period?: string }>;
}

async function BmiProgressContent() {
  const [bmiData, weightHistory] = await Promise.all([
    getUserBmiData(),
    getAggregatedMetrics("weight_kg", "daily"),
  ]);

  return <ProgressPageClient bmiData={bmiData} weightHistory={weightHistory} />;
}

export default async function ProgressPage({ searchParams }: BmiProgressPageProps) {
  // period is accepted but not used in this implementation
  void searchParams;

  return (
    <Suspense fallback={<Skeleton />}>
      <BmiProgressContent />
    </Suspense>
  );
}
