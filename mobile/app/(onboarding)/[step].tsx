import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/ScreenContainer";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  patchCurrentUser,
  type EmergencyContactInput,
  type UserProfileUpdate,
} from "@/api/endpoints/users";
import { sessionStore } from "@/auth/session";
import { ApiError } from "@/api/errors";

const TOTAL_STEPS = 7;

type DraftKey =
  | "full_name"
  | "date_of_birth"
  | "gender"
  | "height_cm"
  | "weight_kg"
  | "blood_type"
  | "phone"
  | "address"
  | "emergency_contact_name"
  | "emergency_contact_phone"
  | "emergency_contact_relationship"
  | "chronic_conditions"
  | "allergies"
  | "current_medications";

interface FieldConfig {
  name: DraftKey;
  labelKey: string;
  type?: "text" | "number" | "email" | "phone" | "multiline";
  required?: boolean;
}

interface StepConfig {
  titleKey: string;
  bodyKey?: string;
  fields: ReadonlyArray<FieldConfig>;
}

const STEPS: StepConfig[] = [
  {
    titleKey: "onboarding.welcomeTitle",
    bodyKey: "onboarding.welcomeBody",
    fields: [],
  },
  {
    titleKey: "onboarding.basicsTitle",
    fields: [
      { name: "full_name", labelKey: "onboarding.fullName", required: true },
      { name: "date_of_birth", labelKey: "onboarding.dateOfBirth" },
      { name: "gender", labelKey: "onboarding.gender" },
    ],
  },
  {
    titleKey: "onboarding.healthTitle",
    fields: [
      { name: "height_cm", labelKey: "onboarding.height", type: "number" },
      { name: "weight_kg", labelKey: "onboarding.weight", type: "number" },
      { name: "blood_type", labelKey: "onboarding.bloodType" },
    ],
  },
  {
    titleKey: "onboarding.contactTitle",
    fields: [
      { name: "phone", labelKey: "onboarding.phone", type: "phone" },
      { name: "address", labelKey: "onboarding.address", type: "multiline" },
    ],
  },
  {
    titleKey: "onboarding.emergencyTitle",
    fields: [
      { name: "emergency_contact_name", labelKey: "onboarding.emergencyName" },
      { name: "emergency_contact_phone", labelKey: "onboarding.emergencyPhone", type: "phone" },
      { name: "emergency_contact_relationship", labelKey: "onboarding.emergencyName" },
    ],
  },
  {
    titleKey: "onboarding.medicalTitle",
    fields: [
      { name: "chronic_conditions", labelKey: "onboarding.conditions", type: "multiline" },
      { name: "allergies", labelKey: "onboarding.allergies", type: "multiline" },
      { name: "current_medications", labelKey: "onboarding.medications", type: "multiline" },
    ],
  },
  {
    titleKey: "onboarding.reviewTitle",
    fields: [],
  },
];

const memoryDraft: { current: Partial<Record<DraftKey, string>> } = { current: {} };

function buildPayload(
  draft: Partial<Record<DraftKey, string>>,
  markComplete: boolean
): UserProfileUpdate {
  const payload: UserProfileUpdate = {};
  const get = (k: DraftKey) => draft[k]?.trim() || undefined;

  if (get("full_name")) payload.full_name = get("full_name");
  if (get("date_of_birth")) payload.date_of_birth = get("date_of_birth");
  const g = get("gender")?.toLowerCase();
  if (g === "male" || g === "female" || g === "other") payload.gender = g;
  if (get("blood_type")) payload.blood_type = get("blood_type")?.toUpperCase();
  if (get("phone")) payload.phone = get("phone");
  if (get("address")) payload.address = get("address");

  const heightStr = get("height_cm");
  const heightNum = heightStr ? Number(heightStr) : undefined;
  if (heightNum !== undefined && !Number.isNaN(heightNum)) payload.height_cm = heightNum;

  const weightStr = get("weight_kg");
  const weightNum = weightStr ? Number(weightStr) : undefined;
  if (weightNum !== undefined && !Number.isNaN(weightNum)) payload.weight_kg = weightNum;

  const ecName = get("emergency_contact_name");
  const ecPhone = get("emergency_contact_phone");
  const ecRel = get("emergency_contact_relationship");
  if (ecName && ecPhone) {
    const contact: EmergencyContactInput = {
      name: ecName,
      phone: ecPhone,
      relationship: ecRel ?? "Other",
    };
    payload.emergency_contacts = [contact];
  }

  const allergies = get("allergies");
  const conditions = get("chronic_conditions");
  const medications = get("current_medications");
  if (allergies || conditions || medications) {
    payload.medical_info = {
      ...(allergies ? { allergies } : {}),
      ...(conditions ? { chronic_conditions: conditions } : {}),
      ...(medications ? { current_medications: medications } : {}),
    };
  }

  if (markComplete) payload.onboarding_completed = true;

  return payload;
}

export default function OnboardingStepScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing, fontWeights, typography } = useTheme();
  const params = useLocalSearchParams<{ step: string }>();

  const stepIndex = Math.max(
    0,
    Math.min(TOTAL_STEPS - 1, Number(params.step ?? 0) || 0)
  );
  const config = STEPS[stepIndex]!;

  const [values, setValues] = useState<Partial<Record<DraftKey, string>>>({
    ...memoryDraft.current,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    memoryDraft.current = { ...values };
  }, [values]);

  const isLast = stepIndex === TOTAL_STEPS - 1;

  const summaryLines = useMemo(() => {
    if (!isLast) return [];
    return Object.entries(values)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => `${k}: ${v}`);
  }, [isLast, values]);

  const persist = async (markComplete = false) => {
    const payload = buildPayload(values, markComplete);
    if (Object.keys(payload).length === 0 && !markComplete) return;
    setSubmitting(true);
    try {
      const updated = await patchCurrentUser(payload);
      sessionStore.getState().setUser(updated);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't save.";
      toast.error(msg);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const onNext = async () => {
    const required = config.fields.filter((f) => f.required);
    for (const f of required) {
      if (!values[f.name]?.trim()) {
        toast.error(`${t(f.labelKey)} is required.`);
        return;
      }
    }
    try {
      if (config.fields.length > 0) {
        await persist(false);
      }
      if (isLast) {
        await persist(true);
        memoryDraft.current = {};
        toast.success(t("common.saved"));
        router.replace("/(tabs)/home");
        return;
      }
      router.replace({
        pathname: "/(onboarding)/[step]",
        params: { step: String(stepIndex + 1) },
      });
    } catch {
      // toast already shown
    }
  };

  const onBack = () => {
    if (stepIndex === 0) return;
    router.replace({
      pathname: "/(onboarding)/[step]",
      params: { step: String(stepIndex - 1) },
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom"]} keyboardAvoiding>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.progress,
          { paddingHorizontal: spacing.base, paddingTop: spacing.md },
        ]}
      >
        <Text
          style={{
            color: colors.brand,
            fontWeight: fontWeights.semibold,
            fontSize: typography.xs.fontSize,
            letterSpacing: 1.2,
          }}
        >
          {t("onboarding.stepOf", {
            current: stepIndex + 1,
            total: TOTAL_STEPS,
          }).toUpperCase()}
        </Text>
        <View
          style={{
            height: 4,
            backgroundColor: colors.surfaceMuted,
            borderRadius: 2,
            marginTop: spacing.sm,
          }}
        >
          <View
            style={{
              height: 4,
              width: `${((stepIndex + 1) / TOTAL_STEPS) * 100}%`,
              backgroundColor: colors.brand,
              borderRadius: 2,
            }}
          />
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.base,
          gap: spacing.lg,
          flexGrow: 1,
        }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: fontWeights.bold,
              fontSize: typography["2xl"].fontSize,
            }}
          >
            {t(config.titleKey)}
          </Text>
          {config.bodyKey ? (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.base.fontSize,
              }}
            >
              {t(config.bodyKey)}
            </Text>
          ) : null}
        </View>

        {config.fields.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            {config.fields.map((field) => (
              <Input
                key={field.name}
                label={t(field.labelKey)}
                value={values[field.name] ?? ""}
                onChangeText={(text) =>
                  setValues((cur) => ({ ...cur, [field.name]: text }))
                }
                multiline={field.type === "multiline"}
                keyboardType={
                  field.type === "number"
                    ? "decimal-pad"
                    : field.type === "phone"
                      ? "phone-pad"
                      : field.type === "email"
                        ? "email-address"
                        : "default"
                }
                autoCapitalize={field.type === "email" ? "none" : "sentences"}
              />
            ))}
          </View>
        ) : null}

        {isLast ? (
          <View style={{ gap: spacing.sm }}>
            {summaryLines.length === 0 ? (
              <Text style={{ color: colors.textMuted }}>
                You can update profile details anytime in Settings.
              </Text>
            ) : (
              summaryLines.map((line) => (
                <Text key={line} style={{ color: colors.text }}>
                  {line}
                </Text>
              ))
            )}
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          <Pressable onPress={onBack} disabled={stepIndex === 0} hitSlop={8}>
            <Text
              style={{
                color: stepIndex === 0 ? colors.textMuted : colors.brand,
                fontWeight: fontWeights.semibold,
                paddingVertical: spacing.md,
              }}
            >
              {t("common.back")}
            </Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Button onPress={onNext} loading={submitting} fullWidth>
              {isLast ? t("onboarding.complete") : t("common.next")}
            </Button>
          </View>
        </View>
      </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progress: {
    width: "100%",
  },
});
