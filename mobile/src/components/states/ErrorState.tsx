import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { ApiError } from "@/api/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const { colors, spacing, fontWeights, typography } = useTheme();
  const t = useT();
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
  const code = error instanceof ApiError ? error.code : undefined;
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
        {title ?? t("common.errorTitle")}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.sm.fontSize,
          marginTop: spacing.sm,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
      {code ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.xs.fontSize,
            marginTop: spacing.xs,
          }}
        >
          {code}
        </Text>
      ) : null}
      {onRetry ? (
        <View style={{ marginTop: spacing.lg }}>
          <Button onPress={onRetry}>{t("common.errorRetry")}</Button>
        </View>
      ) : null}
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
