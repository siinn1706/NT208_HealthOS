import React from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/theme";

function SkeletonBlock({ height, width = "100%" as const }: { height: number; width?: `${number}%` | number }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        height,
        width: width as `${number}%` | number,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceMuted,
        opacity: 0.85,
      }}
    />
  );
}

export function DashboardHeroSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
      <SkeletonBlock height={28} width="70%" />
      <SkeletonBlock height={16} width="90%" />
      <SkeletonBlock height={32} width="45%" />
    </View>
  );
}

export function DashboardKpiSkeletonGrid() {
  const { spacing } = useTheme();
  return (
    <Card>
      <SkeletonBlock height={20} width="40%" />
      <View style={{ height: spacing.md }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexBasis: "47%", flexGrow: 1 }}>
          <SkeletonBlock height={72} />
        </View>
        <View style={{ flexBasis: "47%", flexGrow: 1 }}>
          <SkeletonBlock height={72} />
        </View>
        <View style={{ flexBasis: "47%", flexGrow: 1 }}>
          <SkeletonBlock height={72} />
        </View>
        <View style={{ flexBasis: "47%", flexGrow: 1 }}>
          <SkeletonBlock height={72} />
        </View>
      </View>
    </Card>
  );
}
