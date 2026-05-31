import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../primitives/sheet/bottom-sheet';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { appointmentService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import type { Appointment } from '../../../../shared/api-contracts';

export interface AppointmentProviderSuggestion {
  doctorName: string;
  specialty: string | null;
  clinic: string | null;
  lastAppointmentAt: string;
  appointmentCount: number;
}

interface AppointmentProviderSuggestionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (provider: AppointmentProviderSuggestion) => void;
  bottomInset: number;
}

function providerKey(appointment: Appointment) {
  return [
    appointment.doctor_name.trim().toLowerCase(),
    appointment.specialty?.trim().toLowerCase() ?? '',
    appointment.clinic?.trim().toLowerCase() ?? '',
  ].join('|');
}

export function deriveRecentProviderSuggestions(appointments: Appointment[]) {
  const suggestions = new Map<string, AppointmentProviderSuggestion>();

  appointments.forEach((appointment) => {
    const doctorName = appointment.doctor_name.trim();
    if (!doctorName) return;
    const key = providerKey(appointment);
    const existing = suggestions.get(key);
    if (!existing) {
      suggestions.set(key, {
        doctorName,
        specialty: appointment.specialty,
        clinic: appointment.clinic,
        lastAppointmentAt: appointment.appointment_date,
        appointmentCount: 1,
      });
      return;
    }

    existing.appointmentCount += 1;
    if (new Date(appointment.appointment_date).getTime() > new Date(existing.lastAppointmentAt).getTime()) {
      existing.lastAppointmentAt = appointment.appointment_date;
    }
  });

  return Array.from(suggestions.values())
    .sort((a, b) => new Date(b.lastAppointmentAt).getTime() - new Date(a.lastAppointmentAt).getTime())
    .slice(0, 8);
}

export function AppointmentProviderSuggestionsSheet({
  visible,
  onClose,
  onSelect,
  bottomInset,
}: AppointmentProviderSuggestionsSheetProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadAppointments = useCallback(() => appointmentService.list({ limit: 100 }), []);
  const appointments = useApiQuery(queryKeys.appointments, loadAppointments, { enabled: visible });
  const suggestions = useMemo(
    () => deriveRecentProviderSuggestions(appointments.data ?? []),
    [appointments.data],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheetInner, { paddingBottom: bottomInset + 16 }]}>
        <Text style={[typography.h3, { color: t.ink }]}>Recent providers</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
          Choose from appointments already saved in Core.
        </Text>

        {appointments.isLoading && <ApiState title={i18n('care.loadingAppointments')} loading />}
        {appointments.error && (
          <ApiState
            title={i18n('care.appointmentsUnavailable')}
            message={appointments.error.message}
            actionLabel={i18n('common.retry')}
            onAction={appointments.reload}
          />
        )}
        {!appointments.isLoading && !appointments.error && suggestions.length === 0 && (
          <ApiState
            title="No recent providers"
            message="Book manually once, then saved providers appear here."
          />
        )}

        {suggestions.map((provider) => {
          const meta = [provider.specialty, provider.clinic].filter(Boolean).join(' - ');
          return (
            <Pressable
              key={`${provider.doctorName}-${provider.specialty ?? ''}-${provider.clinic ?? ''}`}
              onPress={() => onSelect(provider)}
              style={({ pressed }) => [
                styles.providerRow,
                { borderColor: t.border, backgroundColor: t.card, borderRadius: t.radius.lg },
                pressed && { opacity: 0.72 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Use ${provider.doctorName}`}
            >
              <View style={styles.providerText}>
                <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>
                  {provider.doctorName}
                </Text>
                <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>
                  {meta || 'Appointment history'}
                </Text>
              </View>
              <Text style={[typography.micro, { color: t.brand }]}>
                {provider.appointmentCount} saved
              </Text>
            </Pressable>
          );
        })}

        <Button label={i18n('common.close')} variant="soft" onPress={onClose} style={{ marginTop: 8 }} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetInner: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  providerText: { flex: 1, gap: 2 },
});
