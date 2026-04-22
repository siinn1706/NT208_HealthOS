import React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useTheme } from "@/theme";
import { spacing as spacingTokens, tabBarFrameHeight } from "@/theme/tokens";

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
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const tabClearance = tabBarFrameHeight() + spacingTokens.base + insets.bottom;
  return (
    <ScreenContainer edges={edges} keyboardAvoiding={keyboardAvoiding}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          { padding: spacing.base, paddingBottom: tabClearance, gap: spacing.base },
          contentContainerStyle,
        ]}
        {...rest}
      >
        {children}
      </ScrollView>
    </ScreenContainer>
  );
}
