import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Input } from '../primitives/input/input';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { profileService } from '../../api/services';

const PROVIDERS = ['Bảo Hiểm Y Tế (BHYT)', 'AIA', 'Manulife', 'Prudential', 'Other'];
const INSURANCE_FIELD_LIMIT = 128;

export function InsuranceForm() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [provider, setProvider] = useState('');
  const [policyNum, setPolicyNum] = useState('');
  const [groupNum, setGroupNum] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!provider) { setError('Select an insurance provider.'); return; }
    if (!policyNum.trim()) { setError('Policy number is required.'); return; }
    if (provider.trim().length > INSURANCE_FIELD_LIMIT) { setError('Provider must be 128 characters or fewer.'); return; }
    if (policyNum.trim().length > INSURANCE_FIELD_LIMIT) { setError('Policy number must be 128 characters or fewer.'); return; }
    if (groupNum.trim().length > INSURANCE_FIELD_LIMIT) { setError('Group number must be 128 characters or fewer.'); return; }
    setSaving(true);
    setError(null);
    try {
      const current = await profileService.me();
      const existingMedical = (current.medical_info ?? {}) as Record<string, unknown>;
      await profileService.updateMe({
        medical_info: {
          ...existingMedical,
          insurance: {
            provider: provider.trim(),
            policy_number: policyNum.trim(),
            group_number: groupNum.trim() || null,
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

      <Input label={i18n('forms.policyNumber')} value={policyNum} onChangeText={setPolicyNum} placeholder={i18n('forms.policyNumberPlaceholder')} maxLength={INSURANCE_FIELD_LIMIT} style={s.field} />
      <Input label={i18n('forms.groupNumber')} value={groupNum} onChangeText={setGroupNum} placeholder={i18n('forms.groupNumberPlaceholder')} maxLength={INSURANCE_FIELD_LIMIT} style={s.field} />

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>{i18n('forms.uploadCard')}</Text>
      <View style={[s.infoCard, { borderRadius: t.radius.lg, borderColor: t.border, backgroundColor: t.card }]}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{i18n('forms.cardUploadUnavailableTitle')}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
          {i18n('forms.cardUploadUnavailableMessage')}
        </Text>
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
  infoCard:     { borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
