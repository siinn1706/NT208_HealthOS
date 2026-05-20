import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { IconAlert, IconCheck, IconX, IconClock, ChevronLeft, ChevronRight } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatTime } from '../../api/viewModels';

const OPTIONS = [
  { id: 'taken',   Icon: IconCheck, color: '#059669', title: 'I took it late',      sub: 'Log the dose as taken' },
  { id: 'skipped', Icon: IconX,     color: '#E54D4D', title: 'I skipped this dose', sub: 'Mark as skipped' },
  { id: 'now',     Icon: IconClock, color: '#1965B3', title: 'Take it now',          sub: 'Log it now' },
];

export function MissedDoseScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadDoses = useCallback(() => medicationService.today(), []);
  const doses = useApiQuery(queryKeys.medicationDosesToday, loadDoses);
  const dose = doses.data?.find((item) => item.medication_plan_id === medicationId) ?? null;
  const [savingChoice, setSavingChoice] = useState(false);
  const [choiceError, setChoiceError] = useState<string | null>(null);

  async function handleChoice(choice: string) {
    if (!dose) return;
    setSavingChoice(true);
    setChoiceError(null);
    try {
      if (choice === 'skipped') await medicationService.skipDose(dose.reminder_id, dose.occurrence_id);
      else await medicationService.markDoseDone(dose.reminder_id, dose.occurrence_id);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medicationDosesToday);
      router.back();
    } catch (err) {
      setChoiceError(err instanceof Error ? err.message : 'Could not save your choice.');
    } finally {
      setSavingChoice(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('meds.missedDose')}
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel={i18n('common.back')} />}
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
        {doses.isLoading && <ApiState title={i18n('api.loading')} loading />}
        {doses.error && <ApiState title={i18n('api.unavailable')} message={doses.error.message} actionLabel={i18n('common.retry')} onAction={doses.reload} />}
        {!doses.isLoading && !doses.error && !dose && (
          <ApiState title="No missed dose found" message="No scheduled occurrence is available for this medication today." />
        )}

        {dose && (
          <>
            <View style={[s.alertBanner, { backgroundColor: `${t.danger}18`, borderColor: `${t.danger}40`, borderRadius: t.radius.lg }]}>
              <View style={[s.alertIcon, { backgroundColor: t.danger, borderRadius: t.radius.md }]}>
                <IconAlert size={22} color="#fff" />
              </View>
              <View style={s.flex}>
                <Text style={[typography.h3, { color: t.ink }]}>Missed · {dose.plan_name}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                  Scheduled {formatTime(dose.scheduled_at)}
                </Text>
              </View>
            </View>

            <Text style={[typography.h3, { color: t.ink, marginBottom: 10, marginTop: 4 }]}>{i18n('meds.whatToDo')}</Text>

            {choiceError && <ApiState title="Could not save choice" message={choiceError} />}

            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => handleChoice(opt.id)}
                disabled={savingChoice}
                style={({ pressed }) => [
                  s.optionRow,
                  { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg },
                  (pressed || savingChoice) && { opacity: 0.75 },
                ]}
              >
                <View style={[s.optIcon, { backgroundColor: `${opt.color}18`, borderRadius: t.radius.md }]}>
                  <opt.Icon size={20} color={opt.color} />
                </View>
                <View style={s.flex}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>{opt.title}</Text>
                  <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{opt.sub}</Text>
                </View>
                <ChevronRight size={16} color={t.brand} />
              </Pressable>
            ))}

            {/* Guidance only shown when dose context is present */}
            <Card style={[s.guidanceCard, { backgroundColor: t.chip }]}>
              <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }]}>
                {i18n('meds.guidance')}
              </Text>
              <Text style={[typography.caption, { color: t.ink2, lineHeight: 18 }]}>
                {i18n('meds.guidanceText')}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  bar:         { paddingHorizontal: 16 },
  flex:        { flex: 1 },
  content:     { paddingHorizontal: 16, gap: 10 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1 },
  alertIcon:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  optionRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  optIcon:     { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  guidanceCard:{ marginTop: 4, borderRadius: 14 },
});
