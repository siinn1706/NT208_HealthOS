import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

export interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  edges?: Edge[];
  keyboardAvoiding?: boolean;
  /** Passed to `KeyboardAvoidingView` when `keyboardAvoiding` is true. */
  keyboardVerticalOffset?: number;
}

/**
 * Shared shell owner: safe-area background, edge selection, optional
 * keyboard avoidance, outer flex — no route-specific padding.
 */
export function ScreenContainer({
  children,
  edges = ["top"],
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  style,
  ...rest
}: ScreenContainerProps) {
  const { colors } = useTheme();
  const body = (
    <View style={[styles.flex, style]} {...rest}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
