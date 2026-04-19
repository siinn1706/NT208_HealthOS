import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { displayLabel, sessionStore, type SessionUser } from "@/auth/session";
import {
  patchCurrentUser,
  uploadAvatar,
  type UserProfileUpdate,
} from "@/api/endpoints/users";
import { ApiError } from "@/api/errors";

interface ProfileDraft {
  full_name: string;
  phone: string;
  address: string;
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}

const FIELDS: Array<{ key: keyof ProfileDraft; labelKey: string; kind?: "phone" | "default" }> = [
  { key: "full_name", labelKey: "profile.fullName" },
  { key: "phone", labelKey: "profile.phone", kind: "phone" },
  { key: "address", labelKey: "profile.address" },
  { key: "blood_type", labelKey: "profile.bloodType" },
  { key: "emergency_contact_name", labelKey: "profile.emergencyName" },
  { key: "emergency_contact_phone", labelKey: "profile.emergencyPhone", kind: "phone" },
  { key: "emergency_contact_relationship", labelKey: "profile.emergencyRelationship" },
];

export default function ProfileScreen() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, spacing, fontWeights, typography, radius } = useTheme();
  const user = sessionStore((s) => s.user) as SessionUser | null;
  const [draft, setDraft] = useState<ProfileDraft>(() => userToDraft(user));
  const [uploading, setUploading] = useState(false);

  // Hydrate the form once the user object becomes available. Without this,
  // a cold-start that lands on `/more/profile` before `AuthProvider` finishes
  // calling `GET /v1/users/me` leaves the draft initialized from a `null`
  // user and the form stays empty even after the user loads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user) setDraft(userToDraft(user));
  }, [user?.id]);

  const save = useMutation({
    mutationFn: () => patchCurrentUser(draftToPayload(draft)),
    onSuccess(updated) {
      sessionStore.getState().setUser(updated);
      qc.invalidateQueries({ queryKey: ["user", "me"] });
      toast.success(t("common.saved"));
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : t("profile.couldNotSave"));
    },
  });

  const onPickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(t("profile.permissionRequired"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const filename = manipulated.uri.split("/").pop() ?? "avatar.jpg";
      const updated = await uploadAvatar({
        uri: manipulated.uri,
        name: filename,
        type: "image/jpeg",
      });
      sessionStore.getState().setUser(updated);
      toast.success(t("common.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("profile.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const headerName = displayLabel(user);

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("more.profile")} />
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Pressable onPress={onPickAvatar} disabled={uploading} hitSlop={4}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.pill,
                backgroundColor: colors.brandMuted,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={{ width: 72, height: 72 }}
                />
              ) : (
                <Text
                  style={{
                    color: colors.brand,
                    fontSize: typography["2xl"].fontSize,
                    fontWeight: fontWeights.bold,
                  }}
                >
                  {headerName.charAt(0).toUpperCase() || "?"}
                </Text>
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontWeight: fontWeights.semibold,
                fontSize: typography.lg.fontSize,
              }}
            >
              {headerName || "—"}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
              {user?.email ?? ""}
            </Text>
            <Pressable onPress={onPickAvatar} hitSlop={6}>
              <Text
                style={{
                  color: colors.brand,
                  fontSize: typography.sm.fontSize,
                  marginTop: 4,
                  fontWeight: fontWeights.semibold,
                }}
              >
                {uploading ? t("profile.uploading") : t("profile.changeAvatar")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.md }}>
          {FIELDS.map((f) => (
            <Input
              key={String(f.key)}
              label={t(f.labelKey)}
              value={draft[f.key] ?? ""}
              onChangeText={(v) =>
                setDraft((cur) => ({ ...cur, [f.key]: v }))
              }
              autoCapitalize={f.key === "blood_type" ? "characters" : "sentences"}
              keyboardType={f.kind === "phone" ? "phone-pad" : "default"}
            />
          ))}
          <Button onPress={() => save.mutate()} loading={save.isPending} fullWidth>
            {t("common.save")}
          </Button>
        </View>
      </Card>
    </ScreenScroll>
  );
}

function userToDraft(user: SessionUser | null): ProfileDraft {
  const ec = user?.emergency_contacts?.[0];
  return {
    full_name: user?.full_name ?? user?.display_name ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    blood_type: user?.blood_type ?? "",
    emergency_contact_name: ec?.name ?? "",
    emergency_contact_phone: ec?.phone ?? "",
    emergency_contact_relationship: ec?.relationship ?? "",
  };
}

function draftToPayload(draft: ProfileDraft): UserProfileUpdate {
  const payload: UserProfileUpdate = {};
  if (draft.full_name.trim()) payload.full_name = draft.full_name.trim();
  if (draft.phone.trim()) payload.phone = draft.phone.trim();
  if (draft.address.trim()) payload.address = draft.address.trim();
  if (draft.blood_type.trim()) payload.blood_type = draft.blood_type.trim();

  const ecName = draft.emergency_contact_name.trim();
  const ecPhone = draft.emergency_contact_phone.trim();
  const ecRel = draft.emergency_contact_relationship.trim();
  if (ecName && ecPhone) {
    payload.emergency_contacts = [
      {
        name: ecName,
        phone: ecPhone,
        relationship: ecRel || "Other",
      },
    ];
  }

  return payload;
}
