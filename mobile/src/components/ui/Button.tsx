import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  fullWidth,
  leftIcon,
  rightIcon,
  style,
  children,
  ...rest
}: ButtonProps) {
  const { colors, radius, spacing, fontWeights, typography } = useTheme();
  const isDisabled = disabled || loading;

  const sizeStyles: Record<ButtonSize, { padV: number; padH: number; font: keyof typeof typography; minHeight: number }> = {
    sm: { padV: 8, padH: 14, font: "sm", minHeight: 44 },
    md: { padV: 12, padH: 16, font: "base", minHeight: 48 },
    lg: { padV: 16, padH: 20, font: "lg", minHeight: 52 },
  };
  const sz = sizeStyles[size];
  const ty = typography[sz.font];

  const palette: Record<
    ButtonVariant,
    { bg: string; text: string; border?: string; pressed: number }
  > = {
    primary: { bg: colors.brand, text: colors.brandText, pressed: 0.88 },
    secondary: {
      bg: colors.surfaceMuted,
      text: colors.text,
      border: colors.border,
      pressed: 0.92,
    },
    ghost: { bg: "transparent", text: colors.text, pressed: 0.75 },
    destructive: { bg: colors.danger, text: colors.dangerText, pressed: 0.88 },
    link: { bg: "transparent", text: colors.brand, pressed: 0.75 },
  };
  const v = palette[variant];

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      android_ripple={
        variant === "ghost" || variant === "link"
          ? { color: `${colors.border}99` }
          : { color: `${colors.textInverse}33` }
      }
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderRadius: radius.md,
          paddingVertical: sz.padV,
          paddingHorizontal: sz.padH,
          minHeight: sz.minHeight,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: isDisabled ? 0.5 : pressed ? v.pressed : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {leftIcon ? <>{leftIcon}</> : null}
          <Text
            style={[
              styles.label,
              {
                color: v.text,
                fontSize: ty.fontSize,
                lineHeight: ty.lineHeight,
                fontFamily: ty.fontFamily,
                fontWeight: fontWeights.semibold,
                marginHorizontal: leftIcon || rightIcon ? spacing.xs : 0,
                textDecorationLine: variant === "link" ? "underline" : "none",
              },
            ]}
          >
            {children}
          </Text>
          {rightIcon ? <>{rightIcon}</> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    textAlign: "center",
  },
});
