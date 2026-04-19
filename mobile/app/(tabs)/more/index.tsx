import React, { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { displayLabel, sessionStore } from "@/auth/session";
import { logout } from "@/api/endpoints/auth";
import {
  biometricSupported,
  getBiometricPreference,
  setBiometricPreference,
} from "@/auth/biometric";

interface RowProps {
  label: string;
  onPress?: () => void;
  hint?: string;
}

function Row({ label, onPress, hint }: RowProps) {
  const { colors, fontWeights, typography, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      // Every navigation row in the More tab needed an explicit a11y
      // identity. Without these, TalkBack / VoiceOver announced
      // "double tap to activate" with no hint at WHERE you'd land.
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={{
        flexDirection: "row",
        alignItems: "center",
        // Material guideline minimum touch target is 48dp; the wrapper
        // padding alone wasn't getting us there on tightly-packed rows.
        minHeight: 48,
        paddingVertical: spacing.md,
      }}
      android_ripple={{ color: colors.surfaceMuted }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>{label}</Text>
        {hint ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {/* Decorative chevron — hidden from screen readers since the row
          itself already announces "button". */}
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ color: colors.textMuted }}
      >
        ›
      </Text>
    </Pressable>
  );
}

export default function MoreScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, fontWeights, spacing, typography, radius } = useTheme();
  const user = sessionStore((s) => s.user);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    biometricSupported().then(setBiometricAvailable);
    getBiometricPreference().then(setBiometricEnabledState);
  }, []);

  const onBiometricToggle = async (next: boolean) => {
    setBiometricEnabledState(next);
    await setBiometricPreference(next);
    toast.success(t("common.saved"));
  };

  const onSignOut = async () => {
    await logout().catch(() => undefined);
    await sessionStore.getState().clear();
    router.replace("/(auth)/login");
  };

  return (
    <ScreenScroll>
      <PageHeader title={t("more.title")} />

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: colors.brandMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.brand, fontWeight: fontWeights.bold, fontSize: typography["xl"].fontSize }}>
              {(displayLabel(user) || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: typography.lg.fontSize }}>
              {displayLabel(user) || "—"}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
              {user?.email ?? ""}
            </Text>
          </View>
        </View>
      </Card>

      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.base }}>
          <Row label={t("more.profile")} onPress={() => router.push("/(tabs)/more/profile")} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row label={t("more.preferences")} onPress={() => router.push("/(tabs)/more/preferences")} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row label={t("more.security")} onPress={() => router.push("/(tabs)/more/security")} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row label={t("more.devices")} onPress={() => router.push("/(tabs)/more/devices")} />
        </View>
      </Card>

      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.base }}>
          <Row label={t("more.reminders")} onPress={() => router.push("/(tabs)/more/reminders")} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row label={t("more.appointments")} onPress={() => router.push("/(tabs)/more/appointments")} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row label={t("more.reports")} onPress={() => router.push("/(tabs)/more/reports")} />
        </View>
      </Card>

      {biometricAvailable ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>
                {t("settings.biometric")}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}>
                Use fingerprint or face to re-authenticate when the session expires.
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={onBiometricToggle}
              trackColor={{ true: colors.brand, false: colors.borderStrong }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>
      ) : null}

      <Button onPress={onSignOut} variant="destructive" fullWidth>
        {t("auth.signOut")}
      </Button>
    </ScreenScroll>
  );
}
