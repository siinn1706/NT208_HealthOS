import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { buildMedicationPauseBody, type PauseDurationOption } from './pause-medication-payload';

const PAUSE_OPTIONS: { value: PauseDurationOption; labelKey: string }[] = [
  { value: 'manual', labelKey: 'meds.pauseUntilResume' },
  { value: 'one_day', labelKey: 'meds.pauseOneDay' },
  { value: 'three_days', labelKey: 'meds.pauseThreeDays' },
  { value: 'seven_days', labelKey: 'meds.pauseSevenDays' },
  { value: 'custom', labelKey: 'meds.pauseCustom' },
];

export function PauseMedScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const [duration, setDuration] = useState<PauseDurationOption>('manual');
  const [customUntilDate, setCustomUntilDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePause() {
    if (!medicationId) return;
    const result = buildMedicationPauseBody(duration, customUntilDate, reason);
    if ('errorKey' in result) {
      setError(i18n(result.errorKey));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await medicationService.pause(medicationId, result.body);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medication(medicationId));
      invalidateApiQuery(queryKeys.medicationDosesToday);
      invalidateApiQuery(queryKeys.remindersAll);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('meds.pauseFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Dim backdrop — tap to cancel */}
      <Pressable style={s.backdrop} onPress={() => router.back()} />

      <View style={[s.sheet, { backgroundColor: t.bgElev, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[s.handle, { backgroundColor: t.borderStrong }]} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetContent}>
          <View style={s.header}>
            <View style={[s.iconTile, { backgroundColor: `${t.warning}18`, borderRadius: t.radius.md }]}>
              <Text style={{ fontSize: 20 }}>⏸</Text>
            </View>
            <View style={s.flex}>
              <Text style={[typography.title, { color: t.ink }]}>{i18n('meds.pause')}?</Text>
              <Text style={[typography.caption, { color: t.brand, marginTop: 2 }]}>
                {i18n('meds.pauseSubtitle')}
              </Text>
            </View>
          </View>

          {error && <ApiState title={i18n('meds.pauseFailed')} message={error} />}

          <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>{i18n('meds.pauseDuration')}</Text>
          <View style={s.optionGrid}>
            {PAUSE_OPTIONS.map((option) => {
              const selected = duration === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDuration(option.value)}
                  style={[
                    s.option,
                    {
                      backgroundColor: selected ? t.brandSoft : t.card,
                      borderColor: selected ? t.brand : t.border,
                      borderRadius: t.radius.md,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: selected ? t.brand : t.ink }]}>
                    {i18n(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {duration === 'custom' && (
            <View style={s.fieldGroup}>
              <Text style={[typography.caption, s.fieldLabel, { color: t.ink3 }]}>
                {i18n('meds.pauseCustomDate')}
              </Text>
              <TextInput
                value={customUntilDate}
                onChangeText={setCustomUntilDate}
                placeholder={i18n('meds.pauseCustomDatePlaceholder')}
                placeholderTextColor={t.ink4}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel={i18n('meds.pauseCustomDate')}
                style={[
                  typography.body,
                  s.input,
                  { borderColor: t.border, borderRadius: t.radius.md, color: t.ink, backgroundColor: t.card },
                ]}
              />
            </View>
          )}

          <View style={s.fieldGroup}>
            <Text style={[typography.caption, s.fieldLabel, { color: t.ink3 }]}>
              {i18n('meds.pauseReason')}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={i18n('meds.pauseReasonPlaceholder')}
              placeholderTextColor={t.ink4}
              maxLength={500}
              multiline
              accessibilityLabel={i18n('meds.pauseReason')}
              style={[
                typography.body,
                s.input,
                s.reasonInput,
                { borderColor: t.border, borderRadius: t.radius.md, color: t.ink, backgroundColor: t.card },
              ]}
            />
          </View>

          <Text style={[typography.caption, s.contractNote, { color: t.ink3, backgroundColor: t.card, borderColor: t.border }]}>
            {i18n('meds.pauseContractNote')}
          </Text>

          <View style={s.actions}>
            <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} style={s.flex} />
            <Button
              label={saving ? i18n('meds.saving') : i18n('meds.pause')}
              variant="solid"
              onPress={saving ? undefined : handlePause}
              style={[s.flex, { backgroundColor: t.warning }, saving && { opacity: 0.4 }]}
              labelColor="#fff"
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, justifyContent: 'flex-end' },
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { maxHeight: '88%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36 },
  sheetContent: { paddingBottom: 4 },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  iconTile:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flex:         { flex: 1 },
  optionGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  option:       { minWidth: '30%', paddingHorizontal: 12, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  fieldGroup:   { marginBottom: 14 },
  fieldLabel:   { marginBottom: 6 },
  input:        { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10 },
  reasonInput:  { minHeight: 84, textAlignVertical: 'top' },
  contractNote: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, lineHeight: 18, marginBottom: 16 },
  actions:      { flexDirection: 'row', gap: 10 },
});
