import React, { forwardRef } from "react";
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
    ...rest
  },
  ref
) {
  const { colors, radius, spacing, fontWeights, typography } = useTheme();
  const hasError = !!error;
  const borderColor = hasError ? colors.danger : colors.border;

  return (
    <View style={[styles.wrapper, { gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sm.fontSize,
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
            backgroundColor: colors.inputBackground,
            paddingHorizontal: spacing.md,
            minHeight: 48,
          },
        ]}
      >
        {leftAdornment}
        <TextInput
          ref={ref}
          {...rest}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: typography.base.fontSize,
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
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.xs.fontSize,
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
