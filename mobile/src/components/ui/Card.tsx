import React from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "@/theme";

export type CardVariant = "default" | "muted" | "inset";

interface CardProps extends ViewProps {
  padded?: boolean;
  bordered?: boolean;
  /** `muted` = secondary panel; `inset` = nested / low-emphasis surface */
  variant?: CardVariant;
}

export function Card({
  padded = true,
  bordered = true,
  variant = "default",
  style,
  children,
  ...rest
}: CardProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  const bg =
    variant === "muted"
      ? colors.surfaceMuted
      : variant === "inset"
        ? colors.background
        : colors.surface;

  const borderW = bordered ? 1 : 0;
  const borderC = variant === "inset" ? colors.borderStrong : colors.border;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          padding: padded ? spacing.base : 0,
          borderWidth: borderW,
          borderColor: borderC,
        },
        variant === "default" ? [styles.shadow, { elevation: elevation.sm }] : { elevation: 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: "#0B0F14",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
    },
    default: {},
  }),
});
