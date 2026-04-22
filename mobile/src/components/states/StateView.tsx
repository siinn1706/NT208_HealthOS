import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

export type StateDensity = "route" | "section";

export interface StateViewProps {
  /** Full-screen vs compact in-card usage */
  density?: StateDensity;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** Primary visual (e.g. spinner) shown above title */
  visual?: React.ReactNode;
}

export function StateView({
  density = "route",
  title,
  description,
  icon,
  action,
  visual,
}: StateViewProps) {
  const { colors, spacing, fontWeights, typography } = useTheme();
  const pad = density === "route" ? spacing.xl : spacing.base;
  const titleSize = density === "route" ? typography.lg : typography.base;
  const descSize = typography.sm;

  return (
    <View style={[styles.wrap, density === "route" ? styles.route : styles.section, { padding: pad }]}>
      {visual ? <View style={{ marginBottom: spacing.md }}>{visual}</View> : null}
      {icon ? <View style={{ marginBottom: spacing.sm }}>{icon}</View> : null}
      {title ? (
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: titleSize.fontSize,
            lineHeight: titleSize.lineHeight,
            fontFamily: titleSize.fontFamily,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: descSize.fontSize,
            lineHeight: descSize.lineHeight,
            fontFamily: descSize.fontFamily,
            marginTop: title ? spacing.sm : 0,
            textAlign: "center",
          }}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg, width: "100%", alignItems: "center" }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  route: {
    flex: 1,
  },
  section: {
    alignSelf: "stretch",
  },
});
