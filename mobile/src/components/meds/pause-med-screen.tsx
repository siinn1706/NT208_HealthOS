import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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

export function PauseMedScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePause() {
    if (!medicationId) return;
    setSaving(true);
    setError(null);
    try {
      await medicationService.pause(medicationId);
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medication(medicationId));
      invalidateApiQuery(queryKeys.medicationDosesToday);
      invalidateApiQuery(queryKeys.remindersAll);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pause medication.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Dim backdrop — tap to cancel */}
      <Pressable style={s.backdrop} onPress={() => router.back()} />

      {/* Bottom sheet */}
      <View style={[s.sheet, { backgroundColor: t.bgElev, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[s.handle, { backgroundColor: t.borderStrong }]} />

        {/* Header icon + title */}
        <View style={s.header}>
          <View style={[s.iconTile, { backgroundColor: `${t.warning}18`, borderRadius: t.radius.md }]}>
            <Text style={{ fontSize: 20 }}>⏸</Text>
          </View>
          <View style={s.flex}>
            <Text style={[typography.title, { color: t.ink }]}>{i18n('meds.pause')}?</Text>
            <Text style={[typography.caption, { color: t.brand, marginTop: 2 }]}>
              Suspends all dose reminders until you resume it
            </Text>
          </View>
        </View>

        {error && <ApiState title="Pause failed" message={error} />}

        <Text style={[typography.caption, s.contractNote, { color: t.ink3, backgroundColor: t.card, borderColor: t.border }]}>
          This pauses the plan until you resume it. Timed pauses and pause reasons are not supported by the current Core contract.
        </Text>

        {/* Actions — ghost cancel + orange pause */}
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
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, justifyContent: 'flex-end' },
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36 },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  iconTile:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flex:         { flex: 1 },
  contractNote: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, lineHeight: 18, marginBottom: 16 },
  actions:      { flexDirection: 'row', gap: 10 },
});
