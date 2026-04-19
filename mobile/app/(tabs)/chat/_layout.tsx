import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ChatStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}
