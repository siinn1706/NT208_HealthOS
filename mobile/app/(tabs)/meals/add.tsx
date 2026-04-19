import React, { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/theme";
import { createMealJson } from "@/api/endpoints/meals";
import { ApiError } from "@/api/errors";

export default function AddMealScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, spacing } = useTheme();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createMealJson({
        name: name.trim(),
        notes: notes.trim() || undefined,
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["meals", "calories-summary"] });
      toast.success(t("common.saved"));
      router.back();
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save meal.");
    },
  });

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("meals.addMeal")} />
      <Card>
        <View style={{ gap: spacing.md }}>
          <Input label="Meal name" value={name} onChangeText={setName} />
          <Input label="Notes" value={notes} onChangeText={setNotes} multiline />
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            For automatic calorie analysis, use Snap a photo from the Meals tab.
          </Text>
          <Button
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!name.trim()}
            fullWidth
          >
            {t("common.save")}
          </Button>
        </View>
      </Card>
    </ScreenScroll>
  );
}
