import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme";

export default function IndexScreen() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}
