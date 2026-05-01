import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { ApiState } from '../api/ApiState';
import { ChevronLeft, IconAlert, IconCheck } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';

export function ArchiveMedScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!confirmed || !medicationId) return;
    setSaving(true);
    setError(null);
    try {
      await medicationService.archive(medicationId);
      invalidateApiQuery(queryKeys.medications);
      router.replace('/(tabs)/meds');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive medication.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Archive medication"
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
        {/* Warning banner */}
        <View style={[s.warnBanner, { backgroundColor: `${t.warning}18`, borderColor: `${t.warning}40`, borderRadius: t.radius.lg }]}>
          <IconAlert size={20} color={t.warning} />
          <View style={s.flex}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>Archive medication?</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2, lineHeight: 18 }]}>
              Archiving moves this medication to your history. Reminders will stop and it will no longer appear in your active list.
            </Text>
          </View>
        </View>

        {/* Consequences list */}
        <Card>
          {[
            'All dose reminders will be disabled',
            'Medication removed from active list',
            'History and adherence data is preserved',
            'You can restore it at any time from Archives',
          ].map((item, i) => (
            <View
              key={i}
              style={[
                s.consequenceRow,
                i < 3 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
              ]}
            >
              <IconCheck size={14} color={t.ink3} />
              <Text style={[typography.caption, { color: t.ink2, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </Card>

        {/* Confirmation checkbox */}
        <Pressable onPress={() => setConfirmed(v => !v)} style={s.checkRow}>
          <View
            style={[
              s.checkbox,
              {
                borderColor: confirmed ? t.brand : t.borderStrong,
                backgroundColor: confirmed ? t.brand : 'transparent',
                borderRadius: t.radius.sm,
              },
            ]}
          >
            {confirmed && <IconCheck size={12} color="#fff" />}
          </View>
          <Text style={[typography.caption, { color: t.ink2, flex: 1 }]}>
            I understand this will stop all reminders for this medication
          </Text>
        </Pressable>

        {error && <ApiState title="Archive failed" message={error} />}

        {/* Actions */}
        <View style={s.actions}>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={s.flex} />
          <Button
            label={saving ? 'Archiving...' : 'Archive'}
            variant="solid"
            onPress={(!confirmed || saving) ? undefined : handleArchive}
            style={[s.flex, (!confirmed || saving) && { opacity: 0.4 }]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  bar:            { paddingHorizontal: 16 },
  content:        { flex: 1, paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  flex:           { flex: 1 },
  warnBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderWidth: 1 },
  consequenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  checkRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox:       { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  actions:        { flexDirection: 'row', gap: 10 },
});
