import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { ChevronLeft, IconClock } from '../../icons';
import { ApiState } from '../api/ApiState';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';

const DURATION_OPTIONS = ['1 week', '2 weeks', '1 month', 'Custom'];

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
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Pause medication"
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
        />
      </View>

      <View style={s.content}>
        {/* Clock icon hero */}
        <View style={[s.clockHero, { backgroundColor: t.brandSoft, borderRadius: t.radius.xl }]}>
          <View style={[s.clockCircle, { backgroundColor: t.brand + '22', borderRadius: 40 }]}>
            <IconClock size={36} color={t.brand} />
          </View>
          <Text style={[typography.h3, { color: t.ink, marginTop: 12 }]}>Pause medication</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>
            Suspends all dose reminders for the selected duration
          </Text>
        </View>

        {error && <ApiState title="Pause failed" message={error} />}
        {/* Med name banner */}
        <Card style={{ ...s.medBanner, backgroundColor: t.chip }}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>Pause medication</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
            Pausing will suspend all dose reminders for this medication.
          </Text>
        </Card>

        {/* Duration picker */}
        <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>PAUSE DURATION</Text>
        <View style={s.durationGrid}>
          {DURATION_OPTIONS.map((opt, i) => {
            const active = selectedDuration === i;
            return (
              <Pressable
                key={opt}
                onPress={() => setSelectedDuration(i)}
                style={[
                  s.durationChip,
                  {
                    borderRadius: t.radius.md,
                    backgroundColor: active ? t.brandSoft : t.card,
                    borderColor: active ? t.brand : t.border,
                  },
                ]}
              >
                <Text style={[typography.bodyMed, { color: active ? t.brand : t.ink2 }]}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reason input */}
        <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>REASON (OPTIONAL)</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Side effects, travelling..."
          placeholderTextColor={t.ink4}
          multiline
          numberOfLines={3}
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

        {/* Warning note */}
        <Text style={[typography.caption, { color: t.ink3, lineHeight: 18 }]}>
          Always consult your doctor before pausing prescribed medications. Pausing will resume automatically after the selected duration.
        </Text>

        {/* Actions */}
        <View style={s.actions}>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={s.flex} />
          <Button label={saving ? 'Pausing...' : 'Pause medication'} variant="solid" onPress={saving ? undefined : handlePause} style={[s.flex, saving && { opacity: 0.4 }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { flex: 1, paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  clockHero:    { alignItems: 'center', padding: 24 },
  clockCircle:  { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  medBanner:    {},
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, minWidth: '45%', alignItems: 'center' },
  reasonInput:  { borderWidth: StyleSheet.hairlineWidth, padding: 12, textAlignVertical: 'top', height: 80, fontSize: 14 },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 8 },
  flex:         { flex: 1 },
});
