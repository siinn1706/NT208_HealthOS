import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TAB_BAR_CONTENT_HEIGHT } from '../nav/tab-bar-metrics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { Checkbox } from '../primitives/input/checkbox';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { ChevronLeft } from '../../icons';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate, formatTime } from '../../api/viewModels';
import {
  VISIT_PREP_CHECKLIST_ITEMS,
  buildVisitPrepChecklist,
  mergeSavedVisitPrepChecklist,
} from './visit-prep-checklist';

export function VisitPrepScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const apptId = (Array.isArray(id) ? id[0] : id) ?? '';
  const [checked, setChecked] = useState<boolean[]>(() => VISIT_PREP_CHECKLIST_ITEMS.map(() => false));
  const [hydratedPrepId, setHydratedPrepId] = useState('');
  const [prepDirty, setPrepDirty] = useState(false);
  const [savingPrep, setSavingPrep] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadAppointment = useCallback(() => appointmentService.detail(apptId), [apptId]);
  const appointmentQuery = useApiQuery(queryKeys.appointment(apptId), loadAppointment, { enabled: Boolean(apptId) });
  const appointment = apptId ? (appointmentQuery.data ?? null) : null;
  const loadPrep = useCallback(() => appointmentService.getPrep(apptId), [apptId]);
  const prepQuery = useApiQuery(queryKeys.appointmentPrep(apptId), loadPrep, { enabled: Boolean(apptId) });
  const checklistDisabled = prepQuery.isLoading || savingPrep;

  const completedCount = checked.filter(Boolean).length;
  const progress = completedCount / VISIT_PREP_CHECKLIST_ITEMS.length;

  function toggleItem(index: number) {
    if (checklistDisabled) return;
    setPrepDirty(true);
    setSaveMessage(null);
    setSaveError(null);
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  useEffect(() => {
    setHydratedPrepId('');
    setPrepDirty(false);
    setChecked(VISIT_PREP_CHECKLIST_ITEMS.map(() => false));
    setSaveMessage(null);
    setSaveError(null);
  }, [apptId]);

  useEffect(() => {
    if (!apptId || hydratedPrepId === apptId || prepDirty || !prepQuery.data) return;
    setChecked(mergeSavedVisitPrepChecklist(prepQuery.data.checklist_items));
    setHydratedPrepId(apptId);
  }, [apptId, hydratedPrepId, prepDirty, prepQuery.data]);

  async function saveChecklist() {
    if (!apptId || checklistDisabled) return;
    setSavingPrep(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const savedPrep = await appointmentService.updatePrep(apptId, {
        checklist_items: buildVisitPrepChecklist(checked),
      });
      setChecked(mergeSavedVisitPrepChecklist(savedPrep.checklist_items));
      setHydratedPrepId(apptId);
      setPrepDirty(false);
      invalidateApiQuery(queryKeys.appointmentPrep(apptId));
      await prepQuery.reload();
      setSaveMessage('Checklist saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save checklist.');
    } finally {
      setSavingPrep(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('care.prepForVisit')}
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel={i18n('common.back')}
            />
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16 }]}>
        {/* Hero gradient card */}
        <LinearGradient
          colors={[t.brandSoft, t.accent + '30']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { borderRadius: t.radius.xl }]}
        >
          <Text style={[typography.title, { color: t.ink }]}>Get ready</Text>
          <Text style={[typography.body, { color: t.ink3, marginTop: 4 }]}>Complete this checklist before your visit</Text>
          {/* Progress bar */}
          <View style={[s.barTrack, { backgroundColor: t.border, marginTop: 12 }]}>
            <View style={[s.barFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: t.brand }]} />
          </View>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 6 }]}>
            {completedCount} / {VISIT_PREP_CHECKLIST_ITEMS.length} items complete
          </Text>
        </LinearGradient>

        {/* Appointment context */}
        {apptId && appointmentQuery.isLoading && <ApiState title={i18n('care.loadingAppointments')} loading />}
        {apptId && appointmentQuery.error && (
          <ApiState
            title={i18n('care.appointmentsUnavailable')}
            message={appointmentQuery.error.message}
            actionLabel={i18n('common.retry')}
            onAction={appointmentQuery.reload}
          />
        )}
        {appointment && (
          <View style={[s.contextCard, { backgroundColor: t.brandSoft, borderColor: t.border, borderRadius: t.radius.lg }]}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>Preparing for: {appointment.doctor_name}</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>
              {appointment.specialty ?? 'Appointment'} · {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_date)}
            </Text>
          </View>
        )}

        {/* Checklist */}
        <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Before your visit</Text>
        <View style={[s.checklistCard, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
          {VISIT_PREP_CHECKLIST_ITEMS.map((item, index) => (
            <React.Fragment key={item}>
              <View style={s.checkRow}>
                <View pointerEvents="none">
                  <Checkbox value={checked[index]} onChange={() => {}} />
                </View>
                <Pressable
                  disabled={checklistDisabled}
                  onPress={() => toggleItem(index)}
                  style={{ flex: 1 }}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color: checked[index] ? t.ink3 : t.ink,
                        textDecorationLine: checked[index] ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              </View>
              {index < VISIT_PREP_CHECKLIST_ITEMS.length - 1 && (
                <View style={[s.divider, { backgroundColor: t.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {prepQuery.isLoading && <ApiState title="Loading saved checklist" loading />}
        {prepQuery.error && (
          <ApiState
            title="Saved checklist unavailable"
            message={prepQuery.error.message}
            actionLabel="Retry"
            onAction={prepQuery.reload}
          />
        )}
        {saveError && <ApiState title="Checklist not saved" message={saveError} />}
        {saveMessage && <ApiState title="Checklist saved" message={saveMessage} />}
        <Button
          label={savingPrep ? i18n('common.working') : 'Save checklist'}
          variant="solid"
          onPress={saveChecklist}
          disabled={!apptId || checklistDisabled}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  hero:         { padding: 20, marginBottom: 4 },
  barTrack:     { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill:      { height: 4, borderRadius: 2 },
  contextCard:  { padding: 14, gap: 4 },
  checklistCard:{ padding: 16 },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider:      { height: StyleSheet.hairlineWidth },
});
