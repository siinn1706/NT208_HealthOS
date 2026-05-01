import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Input } from '../primitives/input/Input';
import { Button } from '../primitives/Button';
import { ApiState } from '../api/ApiState';

export function IntakeForm() {
  const t = useTheme();
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
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <View style={s.center}>
        <Text style={[typography.h3, { color: t.ink }]}>Intake submitted</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
          Your intake information has been recorded.
        </Text>
        <Button label="Done" variant="solid" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
      {error && <ApiState title="Validation error" message={error} />}

      <Input label="Full name" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Nguyen Van A" style={s.field} />
      <Input label="Date of birth" value={form.dob} onChangeText={v => set('dob', v)} placeholder="YYYY-MM-DD" keyboardType="numeric" style={s.field} />
      <Input label="Phone number" value={form.phone} onChangeText={v => set('phone', v)} placeholder="+84 xxx xxx xxx" keyboardType="phone-pad" style={s.field} />
      <Input label="Email" value={form.email} onChangeText={v => set('email', v)} placeholder="example@email.com" keyboardType="email-address" autoCapitalize="none" style={s.field} />
      <Input label="Address" value={form.address} onChangeText={v => set('address', v)} placeholder="Street, City, Province" style={s.field} />

      <Button
        label={saving ? 'Submitting...' : 'Submit intake'}
        variant="solid"
        onPress={saving ? undefined : handleSubmit}
        style={[{ marginTop: 20 }, saving && { opacity: 0.4 }]}
      />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8 },
  field:   { marginBottom: 12 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
