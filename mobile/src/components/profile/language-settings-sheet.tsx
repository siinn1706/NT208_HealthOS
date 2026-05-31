import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { UserPreference } from '../../../../shared/api-contracts';
import i18n from '../../i18n';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { preferenceService } from '../../api/services/preference-service';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { IconCheck } from '../../icons';

type Locale = UserPreference['locale'];

const LANGUAGE_OPTIONS: { locale: Locale; label: string; description: string }[] = [
  { locale: 'en', label: 'English', description: 'Use English across the mobile app and AI responses.' },
  { locale: 'vi', label: 'Vietnamese', description: 'Use Vietnamese across the mobile app and AI responses.' },
];

function normalizeLocale(value?: string | null): Locale {
  return value?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LanguageSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const preferences = useApiQuery(queryKeys.preferences, () => preferenceService.me(), { enabled: visible });
  const [selected, setSelected] = useState<Locale>(() => normalizeLocale(i18n.language));
  const [savingLocale, setSavingLocale] = useState<Locale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canChooseLanguage = Boolean(preferences.data) || (!preferences.isLoading && !preferences.error);

  useEffect(() => {
    if (!visible) return;
    setSelected(normalizeLocale(preferences.data?.locale ?? i18n.language));
  }, [preferences.data?.locale, visible]);

  async function selectLanguage(locale: Locale) {
    if (savingLocale) return;
    const previous = selected;
    setSelected(locale);
    setSavingLocale(locale);
    setError(null);
    setSuccess(null);

    try {
      const updated = await preferenceService.update({ locale });
      await i18n.changeLanguage(updated.locale);
      invalidateApiQuery(queryKeys.preferences);
      setSelected(updated.locale);
      setSuccess(`Language set to ${LANGUAGE_OPTIONS.find((opt) => opt.locale === updated.locale)?.label ?? updated.locale}.`);
    } catch (err) {
      setSelected(previous);
      setError(err instanceof Error ? err.message : 'Could not save language preference.');
    } finally {
      setSavingLocale(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[typography.h3, { color: t.ink }]}>Language</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>Saved to your HealthOS preferences.</Text>
          </View>
          <Button label="Close" variant="text" size="sm" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {preferences.isLoading && !preferences.data && <ApiState title="Loading language preference" loading />}
          {preferences.error && !preferences.data && (
            <ApiState
              title="Language preference unavailable"
              message={preferences.error.message}
              actionLabel="Retry"
              onAction={preferences.reload}
            />
          )}

          {canChooseLanguage && LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selected === option.locale;
            const isSaving = savingLocale === option.locale;
            return (
              <Pressable
                key={option.locale}
                accessibilityRole="button"
                accessibilityLabel={`Set language to ${option.label}`}
                accessibilityState={{ selected: isSelected, disabled: Boolean(savingLocale) }}
                disabled={Boolean(savingLocale)}
                onPress={() => selectLanguage(option.locale)}
                style={({ pressed }) => [
                  styles.languageRow,
                  { borderColor: isSelected ? t.brand : t.border, backgroundColor: isSelected ? t.brandSoft : t.bgElev },
                  pressed && !savingLocale && styles.pressed,
                ]}
              >
                <View style={styles.languageCopy}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>{option.label}</Text>
                  <Text style={[typography.caption, { color: t.ink3, marginTop: 3 }]}>{option.description}</Text>
                </View>
                {isSelected && !isSaving && <IconCheck size={20} color={t.brand} />}
                {isSaving && <Text style={[typography.caption, { color: t.brand }]}>Saving</Text>}
              </Pressable>
            );
          })}

          {success && <Text style={[typography.caption, { color: t.success, textAlign: 'center' }]}>{success}</Text>}
          {error && <ApiState title="Language update failed" message={error} />}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { paddingBottom: 32, maxHeight: '86%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  headerCopy: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  languageRow: { minHeight: 72, borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  languageCopy: { flex: 1 },
  pressed: { opacity: 0.8 },
});
