import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';

const DURATION_OPTIONS = ['1 wk', '2 wks', '1 mo', 'Custom'];

export function PauseMedScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [reason, setReason] = useState('');
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
            <Text style={[typography.title, { color: t.ink }]}>Pause medication?</Text>
            <Text style={[typography.caption, { color: t.brand, marginTop: 2 }]}>
              Suspends all dose reminders for the selected duration
            </Text>
          </View>
        </View>

        {error && <ApiState title="Pause failed" message={error} />}

        {/* Duration chips — one row of 4 */}
        <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>PAUSE DURATION</Text>
        <View style={s.durationRow}>
          {DURATION_OPTIONS.map((opt, i) => {
            const active = selectedDuration === i;
            return (
              <Pressable
                key={opt}
                onPress={() => setSelectedDuration(i)}
                style={[
                  s.durationChip,
                  {
                    borderRadius: t.radius.pill,
                    backgroundColor: active ? t.brandSoft : t.card,
                    borderColor: active ? t.brand : t.border,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: active ? t.brand : t.ink2 }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reason input */}
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (optional)…"
          placeholderTextColor={t.ink4}
          style={[
            s.reasonInput,
            {
              backgroundColor: t.card,
              borderColor: t.border,
              borderRadius: t.radius.md,
              color: t.ink,
            },
          ]}
        />

        {/* Actions — ghost cancel + orange pause */}
        <View style={s.actions}>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={s.flex} />
          <Button
            label={saving ? 'Pausing...' : 'Pause'}
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
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  durationRow:  { flexDirection: 'row', gap: 8, marginBottom: 12 },
  durationChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1 },
  reasonInput:  { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 16 },
  actions:      { flexDirection: 'row', gap: 10 },
});
