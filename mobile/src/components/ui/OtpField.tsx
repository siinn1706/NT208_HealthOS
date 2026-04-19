import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View, Text } from "react-native";
import { useTheme } from "@/theme";

interface OtpFieldProps {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | null;
  autoFocus?: boolean;
}

export function OtpField({
  length = 6,
  value,
  onChangeText,
  error,
  autoFocus = true,
}: OtpFieldProps) {
  const { colors, radius, fontWeights, typography, spacing } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const cells = Array.from({ length }, (_, i) => value[i] ?? "");

  return (
    <View>
      <View style={styles.row}>
        {cells.map((char, i) => {
          const isCurrent = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  borderRadius: radius.md,
                  borderColor: error
                    ? colors.danger
                    : isCurrent
                      ? colors.brand
                      : colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: fontWeights.semibold,
                  fontSize: typography["2xl"].fontSize,
                }}
              >
                {char}
              </Text>
            </View>
          );
        })}
      </View>
      {error ? (
        <Text
          style={{
            color: colors.danger,
            fontSize: typography.xs.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {error}
        </Text>
      ) : null}
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={(t) =>
          onChangeText(t.replace(/[^0-9]/g, "").slice(0, length))
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 60,
  },
  hidden: {
    position: "absolute",
    opacity: 0,
    height: 1,
    width: 1,
  },
});
