import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const { colors, fontWeights, typography, spacing } = useTheme();
  return (
    <View style={[styles.row, { paddingHorizontal: spacing.base, paddingVertical: spacing.md }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.bold,
            fontSize: typography["2xl"].fontSize,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sm.fontSize,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
