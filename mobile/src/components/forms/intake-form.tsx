import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
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

export function IntakeForm() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [form, setForm] = useState({ name: '', dob: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await profileService.updateMe({
        full_name: form.name.trim(),
        date_of_birth: form.dob.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });
      invalidateApiQuery(queryKeys.profile);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save intake profile.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <View style={s.center}>
        <Text style={[typography.h3, { color: t.ink }]}>{i18n('forms.intakeSubmitted')}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
          {i18n('forms.intakeSubmittedMessage')}
        </Text>
        <Button label={i18n('common.done')} variant="solid" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
      {error && <ApiState title={i18n('forms.validationError')} message={error} />}

      <Input label={i18n('forms.fullName')} value={form.name} onChangeText={v => set('name', v)} placeholder={i18n('forms.fullNamePlaceholder')} style={s.field} />
      <Input label={i18n('forms.dateOfBirth')} value={form.dob} onChangeText={v => set('dob', v)} placeholder="YYYY-MM-DD" keyboardType="numeric" style={s.field} />
      <Input label={i18n('forms.phoneNumber')} value={form.phone} onChangeText={v => set('phone', v)} placeholder="+84 xxx xxx xxx" keyboardType="phone-pad" style={s.field} />
      <Input label={i18n('auth.email')} value={form.email} onChangeText={v => set('email', v)} placeholder={i18n('auth.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" style={s.field} />
      <Input label={i18n('forms.address')} value={form.address} onChangeText={v => set('address', v)} placeholder={i18n('forms.addressPlaceholder')} style={s.field} />

      <Button
        label={saving ? i18n('forms.submitting') : i18n('forms.submitIntake')}
        variant="solid"
        onPress={saving ? undefined : handleSubmit}
        style={[{ marginTop: 20 }, saving && { opacity: 0.4 }]}
      />
      <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8 },
  field:   { marginBottom: 12 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
