import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { consume as consumeRecoveryCodes } from "@/auth/recoveryCodesStore";

export default function RecoveryCodesScreen() {
  const t = useT();
  const router = useRouter();
  const { colors, spacing, fontWeights, typography } = useTheme();
  const params = useLocalSearchParams<{ nonce?: string }>();

  // Consume the codes once on first mount so they cannot be re-read by
  // re-mounting or back-navigation. The nonce is single-use.
  const consumedRef = useRef(false);
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    setCodes(consumeRecoveryCodes(params.nonce));
  }, [params.nonce]);

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("mfa.recoveryCodes")} />
      <Card>
        <Text
          style={{
            color: colors.warning,
            fontWeight: fontWeights.semibold,
            marginBottom: spacing.md,
          }}
        >
          {t("mfa.saveRecoveryCodes")}
        </Text>
        {codes.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>
            {t("mfa.recoveryCodesGone")}
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {codes.map((c) => (
              <Text
                key={c}
                selectable
                style={{
                  color: colors.text,
                  fontFamily: "monospace",
                  fontSize: typography.lg.fontSize,
                  letterSpacing: 2,
                  paddingVertical: 6,
                }}
              >
                {c}
              </Text>
            ))}
          </View>
        )}
      </Card>
      <Button onPress={() => router.replace("/(tabs)/more/security")} fullWidth>
        {t("common.done")}
      </Button>
    </ScreenScroll>
  );
}
