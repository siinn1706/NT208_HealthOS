import React from "react";
import { View } from "react-native";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";

export interface CompactChartCardProps {
  title: string;
  headerActionLabel?: string;
  onHeaderActionPress?: () => void;
  children: React.ReactNode;
}

export function CompactChartCard({
  title,
  headerActionLabel,
  onHeaderActionPress,
  children,
}: CompactChartCardProps) {
  return (
    <DashboardSectionCard
      title={title}
      headerActionLabel={headerActionLabel}
      onHeaderActionPress={onHeaderActionPress}
    >
      <View>{children}</View>
    </DashboardSectionCard>
  );
}
