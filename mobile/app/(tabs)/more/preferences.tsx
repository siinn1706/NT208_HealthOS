import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SegmentGroup } from "@/components/ui/SegmentGroup";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useT } from "@/i18n";
import { useTheme, type ThemeMode } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  fetchPreferences,
  patchPreferences,
} from "@/api/endpoints/preferences";
import { useLocale, type Locale } from "@/i18n";

const THEME_OPTIONS: { value: ThemeMode; labelKey: string }[] = [
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
  { value: "system", labelKey: "settings.themeSystem" },
];

/**
 * Accent palette + a screen-reader-friendly name per swatch. The
 * picker renders pure color circles, so without the per-swatch label
 * VoiceOver/TalkBack would announce "button" with no clue what color
 * the user is selecting — a hard accessibility regression for users
 * who can't perceive the color directly.
 */
const ACCENT_OPTIONS: { value: string; label: string }[] = [
  { value: "#0E7C66", label: "Teal" },
  { value: "#2563EB", label: "Blue" },
  { value: "#9333EA", label: "Purple" },
  { value: "#DC2626", label: "Red" },
  { value: "#D97706", label: "Amber" },
  { value: "#0891B2", label: "Cyan" },
];

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
];

export default function PreferencesScreen() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const theme = useTheme();
  const { setMode, setAccentColor, mode, accentColor } = theme;
  const { colors, spacing, fontWeights, typography, radius } = theme;
  const { locale, setLocale } = useLocale();

  const prefs = useQuery({
    queryKey: ["preferences", "me"],
    queryFn: fetchPreferences,
  });

  useEffect(() => {
    if (prefs.data) {
      setMode(prefs.data.theme_mode);
      if (prefs.data.accent_color) {
        setAccentColor(prefs.data.accent_color);
      }
    }
  }, [prefs.data, setMode, setAccentColor]);

  const save = useMutation({
    mutationFn: patchPreferences,
    onSuccess(updated) {
      qc.setQueryData(["preferences", "me"], updated);
      toast.success(t("common.saved"));
    },
    onError() {
      toast.error("Couldn't save preferences.");
    },
  });

  const onPickMode = (next: ThemeMode) => {
    setMode(next);
    save.mutate({ theme_mode: next });
  };

  const onPickAccent = (next: string) => {
    setAccentColor(next);
    save.mutate({ accent_color: next });
  };

  if (prefs.isPending) {
    return (
      <ScreenScroll>
        <LoadingState />
      </ScreenScroll>
    );
  }
  if (prefs.isError) {
    return (
      <ScreenScroll>
        <ErrorState error={prefs.error} onRetry={() => prefs.refetch()} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("more.preferences")} />

      <Card>
        <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: typography.lg.fontSize, marginBottom: spacing.sm }}>
          {t("settings.themeMode")}
        </Text>
        <SegmentGroup<ThemeMode>
          accessibilityLabel={t("settings.themeMode")}
          value={mode}
          onChange={onPickMode}
          options={THEME_OPTIONS.map((opt) => ({
            value: opt.value,
            label: t(opt.labelKey),
          }))}
        />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: typography.lg.fontSize, marginBottom: spacing.sm }}>
          {t("settings.accentColor")}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("settings.accentColor")}
          style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}
        >
          {ACCENT_OPTIONS.map((opt) => {
            const active = opt.value.toLowerCase() === accentColor.toLowerCase();
            return (
              <Pressable
                key={opt.value}
                onPress={() => onPickAccent(opt.value)}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected: active }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  backgroundColor: opt.value,
                  borderWidth: active ? 3 : 1,
                  borderColor: active ? colors.text : colors.border,
                }}
              />
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: typography.lg.fontSize, marginBottom: spacing.sm }}>
          {t("settings.language")}
        </Text>
        <SegmentGroup<Locale>
          accessibilityLabel={t("settings.language")}
          value={locale}
          onChange={setLocale}
          options={LOCALE_OPTIONS}
        />
      </Card>
    </ScreenScroll>
  );
}
