import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  const { colors, spacing, fontWeights, typography } = useTheme();
  return (
    <View style={[styles.wrap, { padding: spacing.xl }]}>
      <Text
        style={{
          color: colors.text,
          fontWeight: fontWeights.semibold,
          fontSize: typography.lg.fontSize,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.sm.fontSize,
            marginTop: spacing.sm,
            textAlign: "center",
          }}
        >
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
});
