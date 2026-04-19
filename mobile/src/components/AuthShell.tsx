import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { colors, fontWeights, spacing, typography } = useTheme();
  const t = useT();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { padding: spacing.xl, gap: spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: spacing.xs }}>
            <Text
              style={{
                fontSize: typography.sm.fontSize,
                color: colors.brand,
                fontWeight: fontWeights.bold,
                letterSpacing: 1.4,
              }}
            >
              {t("common.appName").toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: typography["3xl"].fontSize,
                color: colors.text,
                fontWeight: fontWeights.bold,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  fontSize: typography.base.fontSize,
                  color: colors.textMuted,
                  marginTop: 4,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={{ gap: spacing.md }}>{children}</View>
          {footer ? <View>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
});
