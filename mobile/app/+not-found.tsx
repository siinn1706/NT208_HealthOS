import React from "react";
import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import { useTheme } from "@/theme";

export default function NotFoundScreen() {
  const { colors, fontWeights, spacing, typography } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.lg,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: typography["2xl"].fontSize,
            lineHeight: typography["2xl"].lineHeight,
            fontWeight: fontWeights.bold,
          }}
        >
          This screen doesn't exist.
        </Text>
        <Link
          href="/(tabs)/home"
          style={{
            color: colors.brand,
            marginTop: spacing.base,
            fontSize: typography.base.fontSize,
            lineHeight: typography.base.lineHeight,
          }}
        >
          Go to home
        </Link>
      </View>
    </>
  );
}
