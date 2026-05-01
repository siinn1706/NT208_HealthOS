import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Input } from '../primitives/input/Input';
import { Button } from '../primitives/Button';
import { ApiState } from '../api/ApiState';
import { IconCamera, IconPaperclip } from '../../icons';

const PROVIDERS = ['Bảo Hiểm Y Tế (BHYT)', 'AIA', 'Manulife', 'Prudential', 'Other'];

export function InsuranceForm() {
  const t = useTheme();
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
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <View style={s.center}>
        <Text style={[typography.h3, { color: t.ink }]}>Insurance saved</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
          Your insurance information has been recorded.
        </Text>
        <Button label="Done" variant="solid" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
      {error && <ApiState title="Validation error" message={error} />}

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>PROVIDER</Text>
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

      <Input label="Policy number" value={policyNum} onChangeText={setPolicyNum} placeholder="e.g. HC-1234567890" style={s.field} />
      <Input label="Group number (optional)" value={groupNum} onChangeText={setGroupNum} placeholder="e.g. GRP-001" style={s.field} />

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>UPLOAD CARD</Text>
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
            {frontUploaded ? 'Front uploaded' : 'Card front'}
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
            {backUploaded ? 'Back uploaded' : 'Card back'}
          </Text>
        </Pressable>
      </View>

      <Button label={saving ? 'Saving...' : 'Save insurance'} variant="solid" onPress={saving ? undefined : handleSubmit} style={[{ marginTop: 20 }, saving && { opacity: 0.4 }]} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
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
