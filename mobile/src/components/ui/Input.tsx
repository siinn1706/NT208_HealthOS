import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useTheme } from "@/theme";

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leftAdornment,
    rightAdornment,
    containerStyle,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const { colors, radius, spacing, fontWeights, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const hasError = !!error;
  const borderColor = hasError ? colors.danger : focused ? colors.ring : colors.border;

  return (
    <View style={[styles.wrapper, { gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sm.fontSize,
            lineHeight: typography.sm.lineHeight,
            fontFamily: typography.sm.fontFamily,
            fontWeight: fontWeights.medium,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderRadius: radius.md,
            backgroundColor: colors.field,
            paddingHorizontal: spacing.md,
            minHeight: 48,
            borderWidth: 1,
          },
        ]}
      >
        {leftAdornment}
        <TextInput
          ref={ref}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: typography.base.fontSize,
              lineHeight: typography.base.lineHeight,
              fontFamily: typography.base.fontFamily,
              flex: 1,
              paddingVertical: spacing.sm,
            },
            style,
          ]}
        />
        {rightAdornment}
      </View>
      {hasError ? (
        <Text
          style={{
            color: colors.danger,
            fontSize: typography.xs.fontSize,
            lineHeight: typography.xs.lineHeight,
            fontFamily: typography.xs.fontFamily,
            fontWeight: fontWeights.medium,
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.xs.fontSize,
            lineHeight: typography.xs.lineHeight,
            fontFamily: typography.xs.fontFamily,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 0,
  },
});
