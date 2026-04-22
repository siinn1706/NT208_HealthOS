import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme";

export interface KpiSummaryGridProps {
  children: React.ReactNode;
}

export function KpiSummaryGrid({ children }: KpiSummaryGridProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>{children}</View>
  );
}
