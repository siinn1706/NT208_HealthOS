import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { colors, fontWeights, typography, spacing } = useTheme();
  const t = useT();
  if (isOnline) return null;
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.warning,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <Text
        style={{
          color: colors.warningText,
          fontSize: typography.xs.fontSize,
          fontWeight: fontWeights.semibold,
          textAlign: "center",
        }}
      >
        {t("common.offline")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
  },
});
