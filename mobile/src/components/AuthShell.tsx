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
import { Card } from "@/components/ui/Card";

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
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                fontSize: typography.sm.fontSize,
                lineHeight: typography.sm.lineHeight,
                fontFamily: typography.sm.fontFamily,
                color: colors.brand,
                fontWeight: fontWeights.bold,
                letterSpacing: 1.2,
              }}
            >
              {t("common.appName").toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: typography["3xl"].fontSize,
                lineHeight: typography["3xl"].lineHeight,
                fontFamily: typography["3xl"].fontFamily,
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
                  lineHeight: typography.base.lineHeight,
                  fontFamily: typography.base.fontFamily,
                  color: colors.textMuted,
                  marginTop: spacing.xs,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Card variant="default" padded bordered>
            <View style={{ gap: spacing.md }}>{children}</View>
          </Card>
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
