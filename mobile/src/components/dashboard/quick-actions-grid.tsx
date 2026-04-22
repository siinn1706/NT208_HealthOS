import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme";

export interface QuickActionsGridProps {
  children: React.ReactNode;
}

export function QuickActionsGrid({ children }: QuickActionsGridProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>{children}</View>
  );
}
