import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { ApiState } from '../api/ApiState';
import { ProgressRing } from '../charts/ProgressRing';
import { IconPill, IconClock, IconStethoscope, IconCalendar, ChevronLeft, IconMore } from '../../icons';
import { AdherenceBarChart } from './AdherenceBarChart';
import { useApiQuery, invalidateApiQuery } from '../../api/query';
import { medicationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { toMedicationDetailRows } from '../../api/viewModels';

export function MedicationDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadMedication = useCallback(async () => {
    const [detail, adherence] = await Promise.all([
      medicationService.detail(medicationId),
      medicationService.adherence(medicationId, '30d'),
    ]);
    return { detail, adherence };
  }, [medicationId]);
  const medication = useApiQuery(queryKeys.medication(medicationId), loadMedication, { enabled: Boolean(medicationId) });
  const detail = medication.data?.detail;
  const adherence = medication.data?.adherence;
  const percent = adherence ? (adherence.percent > 1 ? adherence.percent / 100 : adherence.percent) : 0;

  const [moreOpen, setMoreOpen] = useState(false);
  const [savingDoseId, setSavingDoseId] = useState<string | null>(null);
  const [doseError, setDoseError] = useState<string | null>(null);
  const [pauseSaving, setPauseSaving] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={detail?.name ?? 'Medication'}
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
          right={
            <IconButton
              icon={<IconMore size={20} color={t.ink} />}
              onPress={() => setMoreOpen(true)}
              accessibilityLabel="More options"
            />
          }
        />
      </View>

      {/* More options modal sheet */}
      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setMoreOpen(false)}>
          <View style={[s.sheet, { backgroundColor: t.bgElev, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
            <View style={[s.handle, { backgroundColor: t.borderStrong }]} />
            {[
              { label: 'Edit', onPress: () => { setMoreOpen(false); detail && router.push(`/meds/edit/${detail.id}` as never); } },
              { label: 'Refill', onPress: () => { setMoreOpen(false); detail && router.push(`/meds/refill/${detail.id}` as never); } },
              { label: 'History', onPress: () => { setMoreOpen(false); router.push('/meds/history'); } },
              { label: 'Archive', onPress: () => { setMoreOpen(false); detail && router.push(`/meds/archive?id=${detail.id}` as never); } },
              { label: 'Close', onPress: () => setMoreOpen(false) },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={({ pressed }) => [s.sheetRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={[typography.body, { color: item.label === 'Close' ? t.ink3 : t.ink, textAlign: 'center' }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {medication.isLoading && <ApiState title="Loading medication" loading />}
        {medication.error && (
          <ApiState
            title="Medication unavailable"
            message={medication.error.message}
            actionLabel="Retry"
            onAction={medication.reload}
          />
        )}

        {detail && (
          <>
            {/* Icon hero */}
            <View style={[s.iconHero, { backgroundColor: t.card, borderRadius: t.radius.lg }]}>
              <View style={[s.heroIcon, { borderRadius: 16 }]}>
                <IconPill size={32} color="#fff" strokeWidth={1.5} />
              </View>
              <View style={s.flex}>
                <Text style={[typography.title, { color: t.ink }]}>{detail.name}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                  {[detail.strength, detail.form].filter(Boolean).join(' · ') || 'No dose details'}
                </Text>
              </View>
            </View>

            <Card style={s.adherenceCard}>
              <View style={s.adherenceLeft}>
                <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  Adherence · 30d
                </Text>
                <Text style={[typography.display, { color: t.ink, marginTop: 2 }]}>
                  {Math.round(percent * 100)}%
                </Text>
                {adherence && (
                  <AdherenceBarChart
                    values={Array.from({ length: 30 }, (_, i) => {
                      // Approximate visual from overall percent — vary slightly around mean
                      const base = adherence.percent > 1 ? adherence.percent / 100 : adherence.percent;
                      return Math.max(0, Math.min(1, base + (((i * 7 + 3) % 5) - 2) * 0.08));
                    })}
                    height={30}
                  />
                )}
              </View>
              <ProgressRing value={percent} size={80} stroke={7} color={t.success} track={t.border}>
                <Text style={[typography.caption, { color: t.success }]}>
                  {Math.round(percent * 100)}%
                </Text>
              </ProgressRing>
            </Card>

            <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 4 }]}>Dose schedule</Text>
            {doseError && <ApiState title="Could not mark dose" message={doseError} />}
            <Card>
              {detail.doses.length === 0 && (
                <Text style={[typography.caption, { color: t.ink3 }]}>No active dose schedule.</Text>
              )}
              {detail.doses.map((dose, i) => (
                <View key={dose.reminder_id} style={[s.doseRow, i < detail.doses.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                  <View style={[s.dot, { backgroundColor: dose.is_active ? t.success : t.border }]} />
                  <View style={s.flex}>
                    <Text style={[typography.bodyMed, { color: t.ink }]}>{dose.time}</Text>
                    <Text style={[typography.caption, { color: t.ink3 }]}>{dose.repeat}</Text>
                  </View>
                  {dose.is_active && (
                    <Pressable
                      disabled={savingDoseId === dose.reminder_id}
                      onPress={async () => {
                        setSavingDoseId(dose.reminder_id);
                        setDoseError(null);
                        try {
                          await medicationService.markDoseDone(dose.reminder_id);
                          invalidateApiQuery(queryKeys.medications);
                          await medication.reload();
                        } catch (err) {
                          setDoseError(err instanceof Error ? err.message : 'Could not mark dose as taken.');
                        } finally {
                          setSavingDoseId(null);
                        }
                      }}
                      style={[
                        s.takeBtn,
                        { backgroundColor: t.brandSoft, borderRadius: t.radius.pill },
                        savingDoseId === dose.reminder_id && { opacity: 0.5 },
                      ]}
                    >
                      <Text style={[typography.micro, { color: t.brand }]}>
                        {savingDoseId === dose.reminder_id ? '...' : 'Mark taken'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </Card>

            <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 12 }]}>Details</Text>
            <Card>
              {toMedicationDetailRows(detail).map((row, i, arr) => (
                <View key={row.label} style={[s.detailRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                  {row.label === 'Dose' && <IconPill size={16} color={t.ink3} />}
                  {row.label === 'Schedule' && <IconClock size={16} color={t.ink3} />}
                  {row.label === 'Prescriber' && <IconStethoscope size={16} color={t.ink3} />}
                  {row.label === 'Started' && <IconCalendar size={16} color={t.ink3} />}
                  <Text style={[typography.caption, { color: t.ink3, width: 76 }]}>{row.label}</Text>
                  <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{row.val}</Text>
                </View>
              ))}
            </Card>

            {pauseError && <ApiState title="Action failed" message={pauseError} />}
            <View style={[s.actions, { marginTop: 16 }]}>
              <Button
                label={pauseSaving ? '...' : (detail.status === 'paused' ? 'Resume' : 'Pause')}
                variant="ghost"
                style={[s.flex, pauseSaving && { opacity: 0.4 }]}
                onPress={pauseSaving ? undefined : async () => {
                  setPauseSaving(true);
                  setPauseError(null);
                  try {
                    if (detail.status === 'paused') {
                      await medicationService.resume(detail.id);
                    } else {
                      router.push(`/meds/pause/${detail.id}` as never);
                      return;
                    }
                    invalidateApiQuery(queryKeys.medications);
                    invalidateApiQuery(queryKeys.medication(medicationId));
                    await medication.reload();
                  } catch (err) {
                    setPauseError(err instanceof Error ? err.message : 'Action failed.');
                  } finally {
                    setPauseSaving(false);
                  }
                }}
              />
              <Button label="Mark taken" variant="solid" onPress={() => router.push(`/meds/${detail.id}/take` as never)} style={s.flex} />
            </View>
            <Button label="Archive" variant="soft" onPress={() => router.push(`/meds/archive?id=${detail.id}` as never)} style={{ marginTop: 8 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  flex:          { flex: 1 },
  bar:           { paddingHorizontal: 16 },
  content:       { paddingHorizontal: 16, paddingTop: 8 },
  iconHero:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 12 },
  heroIcon:      { width: 72, height: 72, backgroundColor: '#E88B6E', alignItems: 'center', justifyContent: 'center' },
  adherenceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  adherenceLeft: { flex: 1, gap: 6, marginRight: 12 },
  doseRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  dot:           { width: 10, height: 10, borderRadius: 5 },
  takeBtn:       { paddingHorizontal: 12, paddingVertical: 6 },
  detailRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  actions:       { flexDirection: 'row', gap: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:         { padding: 20, paddingBottom: 36 },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetRow:      { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
});
