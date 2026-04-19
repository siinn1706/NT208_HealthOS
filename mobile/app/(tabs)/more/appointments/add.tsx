import React, { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useT } from "@/i18n";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/theme";
import { createAppointment } from "@/api/endpoints/appointments";
import { ApiError } from "@/api/errors";

export default function AddAppointmentScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { typography, colors } = useTheme();

  const [when, setWhen] = useState<Date | null>(null);
  const [doctor, setDoctor] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinic, setClinic] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: () => {
      if (!when) throw new Error("date required");
      return createAppointment({
        appointment_date: when.toISOString(),
        doctor_name: doctor.trim(),
        specialty: specialty.trim() || undefined,
        clinic: clinic.trim() || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(t("common.saved"));
      router.back();
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create.");
    },
  });

  const isValid = !!doctor.trim() && when !== null;

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("appointments.addAppointment")} />
      <Card>
        <View style={{ gap: 12 }}>
          <DateTimeField
            label={t("appointments.date")}
            mode="datetime"
            value={when}
            onChange={setWhen}
            minimumDate={new Date()}
          />
          <Input
            label={t("appointments.doctor")}
            value={doctor}
            onChangeText={setDoctor}
          />
          <Input
            label={t("appointments.specialty")}
            value={specialty}
            onChangeText={setSpecialty}
          />
          <Input
            label={t("appointments.clinic")}
            value={clinic}
            onChangeText={setClinic}
          />
          <Input
            label={t("appointments.reason")}
            value={reason}
            onChangeText={setReason}
          />
          <Input
            label={t("appointments.notes")}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
            {t("appointments.editingNotice")}
          </Text>
          <Button
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!isValid}
            fullWidth
          >
            {t("common.create")}
          </Button>
        </View>
      </Card>
    </ScreenScroll>
  );
}
