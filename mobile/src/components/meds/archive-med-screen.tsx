import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { IconAlert, IconCheck } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';

export function ArchiveMedScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
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
      router.replace('/meds');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive medication.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Dim backdrop */}
      <Pressable style={s.backdrop} onPress={() => router.back()} />

      {/* Centered dialog card */}
      <View style={s.centerWrap} pointerEvents="box-none">
        <View style={[s.dialog, { backgroundColor: t.bgElev, borderRadius: t.radius.xl, ...t.shadows.modal }]}>
          {/* Icon */}
          <View style={[s.iconTile, { backgroundColor: `${t.danger}18`, borderRadius: t.radius.md }]}>
            <IconAlert size={22} color={t.danger} />
          </View>

          <Text style={[typography.title, { color: t.ink, textAlign: 'center', marginTop: 12 }]}>
            {i18n('meds.archive')}?
          </Text>
          <Text style={[typography.caption, { color: t.ink3, textAlign: 'center', marginTop: 6, lineHeight: 18 }]}>
            Archiving moves this medication to your history. Reminders will stop and it will no longer appear in your active list.
          </Text>

          {error && <ApiState title="Archive failed" message={error} />}

          {/* Safety acknowledgement */}
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
            <Text style={[typography.caption, { color: t.ink3, flex: 1 }]}>
              I understand this will stop all reminders
            </Text>
          </Pressable>

          {/* Archive button — full width red */}
          <Button
            label={saving ? i18n('meds.saving') : i18n('meds.archive')}
            variant="solid"
            onPress={(!confirmed || saving) ? undefined : handleArchive}
            style={[s.archiveBtn, { backgroundColor: t.danger }, (!confirmed || saving) && { opacity: 0.4 }]}
            labelColor="#fff"
          />
          <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} style={s.cancelBtn} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  centerWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  dialog:     { width: '100%', padding: 24, alignItems: 'center', gap: 0 },
  iconTile:   { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, width: '100%' },
  checkbox:   { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  archiveBtn: { marginTop: 16, width: '100%' },
  cancelBtn:  { marginTop: 8, width: '100%' },
});
