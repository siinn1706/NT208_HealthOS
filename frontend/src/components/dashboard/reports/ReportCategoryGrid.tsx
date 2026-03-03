import { ReportCategoryCard } from "./ReportCategoryCard";
import type { ReportSection } from "@/types/api";

interface ReportCategoryGridProps {
  sections: ReportSection[];
  locale: string;
  period: string;
}

export function ReportCategoryGrid({ sections, locale, period }: ReportCategoryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sections.map((section) => (
        <ReportCategoryCard
          key={section.category}
          section={section}
          locale={locale}
          period={period}
        />
      ))}
    </div>
  );
}
