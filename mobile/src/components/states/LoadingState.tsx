import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  const { colors, spacing, typography } = useTheme();
  const t = useT();
  return (
    <View style={[styles.wrap, { padding: spacing.lg }]}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.sm.fontSize,
          marginTop: spacing.md,
        }}
      >
        {label ?? t("common.loading")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
