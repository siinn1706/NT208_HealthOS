import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ApiState } from '../api/api-state';
import {
  formatSymptomAppointmentLabel,
  formatSymptomAppointmentMeta,
  STANDALONE_SYMPTOM_TARGET,
  type SymptomAppointmentOption,
} from './symptoms-form-state';

interface SymptomsFormAppointmentPickerProps {
  appointments: SymptomAppointmentOption[];
  selectedTarget: string | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onSelect: (target: string) => void;
}

export function SymptomsFormAppointmentPicker({
  appointments,
  selectedTarget,
  loading,
  error,
  onRetry,
  onSelect,
}: SymptomsFormAppointmentPickerProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  const rows = [
    {
      id: STANDALONE_SYMPTOM_TARGET,
      title: i18n('forms.standaloneSymptomReport'),
      sub: i18n('forms.standaloneSymptomReportSub'),
    },
    ...appointments.map((appointment) => ({
      id: appointment.id,
      title: formatSymptomAppointmentLabel(appointment),
      sub: formatSymptomAppointmentMeta(appointment),
    })),
  ];

  return (
    <View>
      <Text style={[typography.micro, styles.sectionLabel, { color: t.ink3 }]}>
        {i18n('forms.attachToVisit')}
      </Text>
      <Text style={[typography.caption, { color: t.ink4, marginBottom: 8 }]}>
        {i18n('forms.attachToVisitMessage')}
      </Text>
      {loading && <ApiState title={i18n('api.loading')} loading />}
      {error && (
        <ApiState
          title={i18n('api.unavailable')}
          message={error.message}
          actionLabel={i18n('common.retry')}
          onAction={onRetry}
        />
      )}
      {!loading && !error && appointments.length === 0 && (
        <Text style={[typography.caption, { color: t.ink4, marginBottom: 8 }]}>
          {i18n('forms.noUpcomingAppointments')}
        </Text>
      )}
      {!loading && !error && rows.map((row) => {
        const active = selectedTarget === row.id;
        return (
          <Pressable
            key={row.id}
            onPress={() => onSelect(row.id)}
            accessibilityRole="button"
            accessibilityLabel={row.title}
            accessibilityState={{ selected: active }}
            style={[
              styles.targetRow,
              {
                borderRadius: t.radius.md,
                borderColor: active ? t.brand : t.border,
                backgroundColor: active ? t.brandSoft : t.card,
              },
            ]}
          >
            <Text style={[typography.bodyMed, { color: active ? t.brand : t.ink }]}>{row.title}</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{row.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  targetRow:    { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
});
