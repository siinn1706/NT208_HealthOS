import React from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";
import { StateView, type StateDensity } from "./StateView";

interface LoadingStateProps {
  label?: string;
  density?: StateDensity;
}

export function LoadingState({ label, density = "route" }: LoadingStateProps) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <StateView
      density={density}
      visual={<ActivityIndicator size="large" color={colors.brand} />}
      description={label ?? t("common.loading")}
    />
  );
}
