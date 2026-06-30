import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { setStoredLocale } from '../../i18n/language-storage';
import { normalizeLocale, type SupportedLocale } from '../../i18n/supported-locales';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { preferenceService } from '../../api/services/preference-service';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { IconCheck } from '../../icons';

const LANGUAGE_OPTIONS: { locale: SupportedLocale; labelKey: string; descriptionKey: string }[] = [
  { locale: 'en', labelKey: 'me.languageOptionEnglish', descriptionKey: 'me.languageOptionEnglishDescription' },
  { locale: 'vi', labelKey: 'me.languageOptionVietnamese', descriptionKey: 'me.languageOptionVietnameseDescription' },
];

export function LanguageSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { t: i18nText } = useTranslation();
  const preferences = useApiQuery(queryKeys.preferences, () => preferenceService.me(), { enabled: visible });
  const [selected, setSelected] = useState<SupportedLocale>(() => normalizeLocale(i18n.language));
  const [savingLocale, setSavingLocale] = useState<SupportedLocale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canChooseLanguage = Boolean(preferences.data) || (!preferences.isLoading && !preferences.error);

  useEffect(() => {
    if (!visible) return;
    setSelected(normalizeLocale(preferences.data?.locale ?? i18n.language));
  }, [preferences.data?.locale, visible]);

  async function selectLanguage(locale: SupportedLocale) {
    if (savingLocale) return;
    const previous = selected;
    setSelected(locale);
    setSavingLocale(locale);
    setError(null);
    setSuccess(null);

    try {
      const updated = await preferenceService.update({ locale });
      const updatedLocale = normalizeLocale(updated.locale);
      await i18n.changeLanguage(updatedLocale);
      void setStoredLocale(updatedLocale);
      invalidateApiQuery(queryKeys.preferences);
      setSelected(updatedLocale);
      const languageLabel = i18nText(
        LANGUAGE_OPTIONS.find((opt) => opt.locale === updatedLocale)?.labelKey ?? 'me.languageOptionEnglish',
      );
      setSuccess(i18nText('me.languageUpdateSuccess', { language: languageLabel }));
    } catch (err) {
      setSelected(previous);
      setError(err instanceof Error ? err.message : i18nText('me.languageSaveFailed'));
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
            <Text style={[typography.h3, { color: t.ink }]}>{i18nText('me.languageTitle')}</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>{i18nText('me.languageSubtitle')}</Text>
          </View>
          <Button label={i18nText('common.close')} variant="text" size="sm" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {preferences.isLoading && !preferences.data && <ApiState title={i18nText('me.languageLoading')} loading />}
          {preferences.error && !preferences.data && (
            <ApiState
              title={i18nText('me.languagePreferenceUnavailable')}
              message={preferences.error.message}
              actionLabel={i18nText('common.retry')}
              onAction={preferences.reload}
            />
          )}

          {canChooseLanguage && LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selected === option.locale;
            const isSaving = savingLocale === option.locale;
            const label = i18nText(option.labelKey);
            return (
              <Pressable
                key={option.locale}
                accessibilityRole="button"
                accessibilityLabel={i18nText('me.languageOptionAccessibility', { language: label })}
                accessibilityState={{ selected: isSelected, disabled: Boolean(savingLocale) }}
                disabled={Boolean(savingLocale)}
                onPress={() => selectLanguage(option.locale)}
                testID={`language-option-${option.locale}`}
                style={({ pressed }) => [
                  styles.languageRow,
                  { borderColor: isSelected ? t.brand : t.border, backgroundColor: isSelected ? t.brandSoft : t.bgElev },
                  pressed && !savingLocale && styles.pressed,
                ]}
              >
                <View style={styles.languageCopy}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>{label}</Text>
                  <Text style={[typography.caption, { color: t.ink3, marginTop: 3 }]}>{i18nText(option.descriptionKey)}</Text>
                </View>
                {isSelected && !isSaving && <IconCheck size={20} color={t.brand} />}
                {isSaving && <Text style={[typography.caption, { color: t.brand }]}>{i18nText('profile.saving')}</Text>}
              </Pressable>
            );
          })}

          {success && <Text style={[typography.caption, { color: t.success, textAlign: 'center' }]}>{success}</Text>}
          {error && <ApiState title={i18nText('me.languageUpdateFailed')} message={error} />}
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
