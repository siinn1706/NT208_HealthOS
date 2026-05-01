import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/input/Input';
import { useSession } from '../../auth/SessionProvider';

const PROGRESS = 0.4;
type Sex = 'male' | 'female' | 'other';
const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function AuthSetupScreen() {
  const t = useTheme();
  const session = useSession();
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (dob.trim()) {
      const parsed = normalizeDate(dob);
      if (!parsed || !/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return 'Date must be DD/MM/YYYY.';
    }
    const h = Number(height);
    if (height && (isNaN(h) || h <= 50 || h >= 300)) return 'Height must be 51–299 cm.';
    const w = Number(weight);
    if (weight && (isNaN(w) || w <= 10 || w >= 500)) return 'Weight must be 11–499 kg.';
    return null;
  }

  const isValid = validate() === null;

  async function handleFinish() {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setLoading(true);
    setError(null);
    try {
      await session.updateProfile({
        date_of_birth: normalizeDate(dob),
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        onboarding_completed: true,
      });
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: t.border }]}>
          <View style={[styles.progressFill, { backgroundColor: t.brand, width: `${PROGRESS * 100}%` }]} />
        </View>

        <Text style={[typography.title, { color: t.ink, marginTop: 20, marginBottom: 4 }]}>Health profile</Text>
        <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>Help us personalise your experience</Text>

        {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

        <View style={{ marginBottom: 16 }}>
          <Input
            label="Date of birth"
            value={dob}
            onChangeText={setDob}
            placeholder="DD/MM/YYYY"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Sex toggle */}
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 8 }]}>Biological sex</Text>
        <View style={styles.sexRow}>
          {SEX_OPTIONS.map((opt) => {
            const active = sex === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sexBtn,
                  { borderColor: active ? t.brand : t.border, backgroundColor: active ? t.brandSoft : t.card },
                ]}
                onPress={() => setSex(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[typography.chip, { color: active ? t.brand : t.ink3, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Height + Weight with unit suffix */}
        <View style={styles.measureRow}>
          <View style={styles.measureField}>
            <Input label="Height" value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="170" />
            <Text style={[styles.unit, { color: t.ink4 }]}>cm</Text>
          </View>
          <View style={styles.measureField}>
            <Input label="Weight" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="65" />
            <Text style={[styles.unit, { color: t.ink4 }]}>kg</Text>
          </View>
        </View>

        <Button label="Continue" size="lg" loading={loading} onPress={handleFinish} style={{ marginTop: 8 }} />

        <TouchableOpacity style={styles.skipRow} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={[typography.caption, { color: t.ink4 }]}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex:          { flex: 1 },
  scroll:        { paddingBottom: 40 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },
  sexRow:        { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sexBtn:        { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  measureRow:    { flexDirection: 'row', gap: 12 },
  measureField:  { flex: 1, position: 'relative' },
  unit:          { position: 'absolute', right: 14, bottom: 22, fontSize: 13 },
  skipRow:       { alignItems: 'center', marginTop: 16 },
});
