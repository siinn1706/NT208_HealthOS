import React from "react";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

export default function NotFoundScreen() {
  const { colors, fontWeights } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text
          style={{
            color: colors.text,
            fontSize: 24,
            fontWeight: fontWeights.bold,
          }}
        >
          This screen doesn't exist.
        </Text>
        <Link href="/(tabs)/home" style={[styles.link, { color: colors.brand }]}>
          Go to home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 16,
    fontSize: 16,
  },
});
