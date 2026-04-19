import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/theme";
import { createMealMultipart } from "@/api/endpoints/meals";
import { ApiError } from "@/api/errors";

interface ImagePick {
  uri: string;
  width: number;
  height: number;
}

export default function SnapMealScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, spacing, fontWeights, typography, radius } = useTheme();
  const [pick, setPick] = useState<ImagePick | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const onLaunch = async (camera: boolean) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(t("meals.permissionRequired"));
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPick({
      uri: asset.uri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
    });
  };

  /**
   * Both "Analyze" and "Save without analyzing" go through `POST /v1/meals`
   * (multipart) because:
   *   1. It returns the real `meal.id` synchronously — the dedicated
   *      `/v1/meals/analyze-photo` endpoint only returns a Celery `job_id`,
   *      which is NOT a valid `meal_id` and would 404 on the detail screen.
   *   2. The backend auto-enqueues the AI analysis whenever an image is
   *      uploaded (see `meal_svc.create_meal` in
   *      backend/app/api/v1/endpoints/meals.py), so a single endpoint covers
   *      both buttons; the difference is only the toast copy.
   */
  const submit = async (intent: "analyze" | "save") => {
    if (!pick || !name.trim()) return;
    setBusy(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        pick.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const filename = manipulated.uri.split("/").pop() ?? "meal.jpg";
      const meal = await createMealMultipart({
        name: name.trim(),
        image: { uri: manipulated.uri, name: filename, type: "image/jpeg" },
      });
      qc.invalidateQueries({ queryKey: ["meals"] });
      if (intent === "analyze") {
        toast.info(t("meals.analyzing"));
      } else {
        toast.success(t("common.saved"));
      }
      router.replace({
        pathname: "/(tabs)/meals/[mealId]",
        params: { mealId: meal.id },
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("meals.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onAnalyze = () => submit("analyze");
  const onSaveOnly = () => submit("save");

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("meals.snap")} subtitle={t("meals.snapHint")} />

      <Card>
        {pick ? (
          <Image source={{ uri: pick.uri }} style={{ width: "100%", height: 240, borderRadius: radius.md }} resizeMode="cover" />
        ) : (
          <View
            style={{
              width: "100%",
              height: 240,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.borderStrong,
            }}
          >
            <Text style={{ color: colors.textMuted }}>{t("meals.snapHint")}</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            onPress={() => onLaunch(true)}
            accessibilityRole="button"
            accessibilityLabel={t("meals.useCamera")}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.brand,
              alignItems: "center",
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.brandText, fontWeight: fontWeights.semibold }}>
              {t("meals.useCamera")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onLaunch(false)}
            accessibilityRole="button"
            accessibilityLabel={t("meals.useGallery")}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceMuted,
              alignItems: "center",
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
              {t("meals.useGallery")}
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.md }}>
          <Input label={t("meals.name")} value={name} onChangeText={setName} />
          <Button onPress={onAnalyze} loading={busy} disabled={!pick || !name.trim()} fullWidth>
            {t("meals.analyzeWithAi")}
          </Button>
          <Button onPress={onSaveOnly} loading={busy} disabled={!pick || !name.trim()} variant="secondary" fullWidth>
            {t("meals.saveOnly")}
          </Button>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: spacing.sm }}>
          {t("meals.compressionNote")}
        </Text>
      </Card>
    </ScreenScroll>
  );
}
