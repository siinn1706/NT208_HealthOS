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
    <View style={[styles.row, { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md }]}>
      <View style={styles.titleBlock}>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.bold,
            fontSize: typography["2xl"].fontSize,
            lineHeight: typography["2xl"].lineHeight,
            fontFamily: typography["2xl"].fontFamily,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sm.fontSize,
              lineHeight: typography.sm.lineHeight,
              fontFamily: typography.sm.fontFamily,
              marginTop: spacing.xs,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    justifyContent: "center",
    minHeight: 28,
  },
});
