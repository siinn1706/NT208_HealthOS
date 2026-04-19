import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { sessionStore } from "@/auth/session";
import { deleteAccount } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { formatDate } from "@/utils/date";

export default function DeleteAccountScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing, fontWeights, typography } = useTheme();
  const user = sessionStore((s) => s.user);

  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [purgeAt, setPurgeAt] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: () =>
      deleteAccount({
        confirmation_email: confirmation.trim(),
        password: password.trim() || undefined,
        reason: reason.trim() || undefined,
      }),
    async onSuccess(result) {
      setPurgeAt(result.purge_at ?? null);
      // Backend revokes the JWT in the same transaction; clear local session
      // and route to login. Restore is still possible from the login screen
      // until purge_at via POST /v1/users/me/restore.
      await sessionStore.getState().clear();
      Alert.alert(
        "Account scheduled for deletion",
        result.purge_at
          ? `Your account will be permanently removed on ${formatDate(
              result.purge_at,
              "MMM D, YYYY"
            )}. Sign in any time before then to restore it.`
          : "Sign in any time during the grace window to restore it.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    },
    onError(err) {
      if (err instanceof ApiError && err.code === "ALREADY_PENDING_DELETION") {
        toast.info("Your account is already scheduled for deletion.");
      } else if (err instanceof ApiError && err.code === "IDENTITY_CHECK_FAILED") {
        toast.error("Email or password didn't match.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't delete account.");
      }
    },
  });

  const onSubmit = () => {
    Alert.alert(
      "Delete this account?",
      "Your data will be soft-deleted with a 30-day grace period before permanent removal.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => remove.mutate(),
        },
      ]
    );
  };

  const emailMatches =
    confirmation.trim().toLowerCase() === (user?.email ?? "").toLowerCase();

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title="Delete account" />
      <Card>
        <Text
          style={{
            color: colors.danger,
            fontWeight: fontWeights.semibold,
            marginBottom: spacing.sm,
          }}
        >
          This is destructive.
        </Text>
        <Text style={{ color: colors.text, marginBottom: spacing.sm }}>
          Your account will be soft-deleted immediately and permanently removed
          after a 30-day grace period. You can sign in during the grace window
          to restore it.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.xs.fontSize,
          }}
        >
          To confirm, type your email address exactly: {user?.email}
        </Text>
      </Card>

      <Card>
        <View style={{ gap: spacing.md }}>
          <Input
            label="Confirm email"
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <PasswordField
            label="Password (required for password accounts)"
            value={password}
            onChangeText={setPassword}
          />
          <Input
            label="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button
            onPress={onSubmit}
            disabled={!emailMatches}
            loading={remove.isPending}
            variant="destructive"
            fullWidth
          >
            Delete my account
          </Button>
        </View>
      </Card>

      {purgeAt ? (
        <Card>
          <Text style={{ color: colors.text }}>
            Scheduled for purge on {formatDate(purgeAt, "MMM D, YYYY")}.
          </Text>
        </Card>
      ) : null}
    </ScreenScroll>
  );
}
