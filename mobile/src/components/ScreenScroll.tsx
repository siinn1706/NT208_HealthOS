import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

interface ScreenScrollProps extends ScrollViewProps {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  /**
   * If a screen has multiline inputs that ride at the bottom of the visible
   * area (profile, onboarding wizard, reminder add, meal add), opt into the
   * `KeyboardAvoidingView` wrapper. Defaults to `true` so the common case
   * "form on a scroll" works out of the box. Pages that animate or that
   * have their own `KeyboardAvoidingView` can pass `false`.
   */
  keyboardAvoiding?: boolean;
}

export function ScreenScroll({
  children,
  edges = ["top"],
  contentContainerStyle,
  keyboardAvoiding = true,
  ...rest
}: ScreenScrollProps) {
  const { colors, spacing } = useTheme();
  const inner = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { padding: spacing.base, paddingBottom: spacing["3xl"], gap: spacing.base },
        contentContainerStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={edges}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // iOS gets `padding` to lift the bottom of the scroll view
          // when the soft keyboard appears. Android uses `undefined`
          // (not `"height"`) because we already set
          // `softwareKeyboardLayoutMode: "resize"` in app.config.ts —
          // the OS resizes the window for us, and stacking
          // `behavior="height"` on top causes a double-resize that
          // makes the chat composer / form fields jump.
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
