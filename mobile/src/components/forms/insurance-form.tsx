import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Input } from '../primitives/input/input';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { IconCamera, IconPaperclip } from '../../icons';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { profileService } from '../../api/services';

const PROVIDERS = ['Bảo Hiểm Y Tế (BHYT)', 'AIA', 'Manulife', 'Prudential', 'Other'];

export function InsuranceForm() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [provider, setProvider] = useState('');
  const [policyNum, setPolicyNum] = useState('');
  const [groupNum, setGroupNum] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frontUploaded, setFrontUploaded] = useState(false);
  const [backUploaded, setBackUploaded] = useState(false);

  async function handleSubmit() {
    if (!provider) { setError('Select an insurance provider.'); return; }
    if (!policyNum.trim()) { setError('Policy number is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const current = await profileService.me();
      const existingMedical = (current.medical_info ?? {}) as Record<string, unknown>;
      await profileService.updateMe({
        medical_info: {
          ...existingMedical,
          insurance: {
            provider,
            policy_number: policyNum.trim(),
            group_number: groupNum.trim() || null,
            card_front_uploaded: frontUploaded,
            card_back_uploaded: backUploaded,
          },
        },
      });
      invalidateApiQuery(queryKeys.profile);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save insurance details.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <View style={s.center}>
        <Text style={[typography.h3, { color: t.ink }]}>{i18n('forms.insuranceSaved')}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
          {i18n('forms.insuranceSavedMessage')}
        </Text>
        <Button label={i18n('common.done')} variant="solid" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
      {error && <ApiState title={i18n('forms.validationError')} message={error} />}

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>{i18n('forms.provider')}</Text>
      <View style={s.providerGrid}>
        {PROVIDERS.map(p => {
          const active = provider === p;
          return (
            <Pressable
              key={p}
              onPress={() => setProvider(p)}
              style={[
                s.providerChip,
                {
                  borderRadius: t.radius.md,
                  borderColor: active ? t.brand : t.border,
                  backgroundColor: active ? t.brandSoft : t.card,
                },
              ]}
            >
              <Text style={[typography.caption, { color: active ? t.brand : t.ink2 }]}>{p}</Text>
            </Pressable>
          );
        })}
      </View>

      <Input label={i18n('forms.policyNumber')} value={policyNum} onChangeText={setPolicyNum} placeholder={i18n('forms.policyNumberPlaceholder')} style={s.field} />
      <Input label={i18n('forms.groupNumber')} value={groupNum} onChangeText={setGroupNum} placeholder={i18n('forms.groupNumberPlaceholder')} style={s.field} />

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>{i18n('forms.uploadCard')}</Text>
      <View style={s.uploadRow}>
        <Pressable
          onPress={() => setFrontUploaded(true)}
          style={[
            s.uploadCard,
            {
              borderRadius: t.radius.lg,
              borderColor: frontUploaded ? t.success : t.border,
              backgroundColor: frontUploaded ? `${t.success}10` : t.card,
            },
          ]}
        >
          <IconCamera size={24} color={frontUploaded ? t.success : t.ink3} />
          <Text style={[typography.caption, { color: frontUploaded ? t.success : t.ink3, marginTop: 6, textAlign: 'center' }]}>
            {frontUploaded ? i18n('forms.frontUploaded') : i18n('forms.cardFront')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setBackUploaded(true)}
          style={[
            s.uploadCard,
            {
              borderRadius: t.radius.lg,
              borderColor: backUploaded ? t.success : t.border,
              backgroundColor: backUploaded ? `${t.success}10` : t.card,
            },
          ]}
        >
          <IconPaperclip size={24} color={backUploaded ? t.success : t.ink3} />
          <Text style={[typography.caption, { color: backUploaded ? t.success : t.ink3, marginTop: 6, textAlign: 'center' }]}>
            {backUploaded ? i18n('forms.backUploaded') : i18n('forms.cardBack')}
          </Text>
        </Pressable>
      </View>

      <Button label={saving ? i18n('common.working') : i18n('forms.saveInsurance')} variant="solid" onPress={saving ? undefined : handleSubmit} style={[{ marginTop: 20 }, saving && { opacity: 0.4 }]} />
      <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content:      { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  field:        { marginBottom: 12 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  providerChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  uploadRow:    { flexDirection: 'row', gap: 12 },
  uploadCard:   { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', paddingVertical: 24 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
