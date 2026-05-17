import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { ProgressBar } from '../primitives/progress-bar';
import { useSession } from '../../auth/session-provider';

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
      const year = parseInt(parsed.slice(0, 4), 10);
      const currentYear = new Date().getFullYear();
      if (year < currentYear - 120 || year > currentYear - 13) return 'Please enter a valid birth year.';
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
        gender: sex,
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
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* Segmented progress bar */}
      <View style={{ marginBottom: 20 }}>
        <ProgressBar segments={5} filled={2} height={6} />
      </View>

      {/* Eyebrow */}
      <Text style={[typography.caption, { color: t.ink3, fontFamily: 'Inter_700Bold', letterSpacing: 1.4, fontSize: 11, lineHeight: 14, marginBottom: 6 }]}>
        STEP 2 · BODY BASICS
      </Text>

      <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>Tell us a bit about your body</Text>

      <Text style={[typography.caption, { color: t.ink3, marginBottom: 20 }]}>
        Only used to personalize insights. You can change this later.
      </Text>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      <View style={{ marginBottom: 16 }}>
        <Input
          label="Date of birth"
          value={dob}
          onChangeText={setDob}
          placeholder="DD/MM/YYYY"
          keyboardType="numbers-and-punctuation"
          trailingIcon={<Calendar size={18} color={t.ink3} />}
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
                {
                  borderColor: active ? t.brand : t.border,
                  borderWidth: active ? 1.5 : 1,
                  backgroundColor: active ? t.brandSoft : t.card,
                },
              ]}
              onPress={() => setSex(opt.value)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <Text style={[{ fontSize: 14, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular', color: active ? t.brand : t.ink2 }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Height + Weight side-by-side */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={styles.measureField}>
          <Input
            label="Height"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholder="170"
            trailingText="cm"
          />
        </View>
        <View style={styles.measureField}>
          <Input
            label="Weight"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="65"
            trailingText="kg"
          />
        </View>
      </View>

      <Button label="Continue" size="lg" loading={loading} onPress={handleFinish} style={{ marginTop: 8 }} />
    </ScrollView>
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
  scroll:       { paddingBottom: 40 },
  sexRow:       { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sexBtn:       { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  measureField: { flex: 1 },
});
