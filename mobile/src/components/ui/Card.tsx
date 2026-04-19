import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "@/theme";

interface CardProps extends ViewProps {
  padded?: boolean;
  bordered?: boolean;
}

export function Card({
  padded = true,
  bordered = true,
  style,
  children,
  ...rest
}: CardProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: padded ? spacing.base : 0,
          borderWidth: bordered ? 1 : 0,
          borderColor: colors.border,
        },
        styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
