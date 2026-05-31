import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { useSession } from '../../auth/session-provider';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../primitives/button';
import { Card } from '../primitives/card';
import { Input } from '../primitives/input/input';
import { ApiState } from '../api/api-state';

type Sex = 'male' | 'female' | 'other';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];
const DECIMAL_MEASURE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const PROFILE_FIELD_LIMITS = {
  fullName: 255,
  bloodType: 16,
  phone: 32,
  address: 512,
} as const;

function formDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validateMaxLength(value: string, max: number, label: string) {
  if (value.trim().length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

function parseOptionalNumber(value: string, min: number, max: number, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return { value: null };
  if (!DECIMAL_MEASURE_PATTERN.test(trimmed)) return { error: `${label} must be a number.` };
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= min || parsed >= max) {
    return { error: `${label} must be ${min + 1}-${max - 1}.` };
  }
  return { value: parsed };
}

function validateDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return 'Date must be YYYY-MM-DD.';
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Date must be valid.';
  const [, yearPart, monthPart, dayPart] = match;
  if (
    date.getUTCFullYear() !== Number(yearPart)
    || date.getUTCMonth() + 1 !== Number(monthPart)
    || date.getUTCDate() !== Number(dayPart)
  ) {
    return 'Date must be valid.';
  }
  const year = date.getUTCFullYear();
  const currentYear = new Date().getFullYear();
  if (year < currentYear - 120 || year > currentYear - 13) return 'Please enter a valid birth year.';
  return null;
}

export function HealthProfileScreen() {
  const t = useTheme();
  const session = useSession();
  const user = session.user;
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [bloodType, setBloodType] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.full_name ?? user?.display_name ?? '');
    setDob(formDate(user?.date_of_birth));
    setSex(user?.gender ?? null);
    setBloodType(user?.blood_type ?? '');
    setHeight(user?.height_cm ? String(user.height_cm) : '');
    setWeight(user?.weight_kg ? String(user.weight_kg) : '');
    setPhone(user?.phone ?? '');
    setAddress(user?.address ?? '');
  }, [
    user?.address,
    user?.blood_type,
    user?.date_of_birth,
    user?.display_name,
    user?.full_name,
    user?.gender,
    user?.height_cm,
    user?.phone,
    user?.weight_kg,
  ]);

  async function saveProfile() {
    setSuccess(null);
    setError(null);
    const nextFullName = fullName.trim();
    if (!nextFullName) { setError('Full name is required.'); return; }
    const fullNameError = validateMaxLength(nextFullName, PROFILE_FIELD_LIMITS.fullName, 'Full name');
    if (fullNameError) { setError(fullNameError); return; }
    const dateError = validateDate(dob);
    if (dateError) { setError(dateError); return; }
    const bloodTypeError = validateMaxLength(bloodType, PROFILE_FIELD_LIMITS.bloodType, 'Blood type');
    if (bloodTypeError) { setError(bloodTypeError); return; }
    const parsedHeight = parseOptionalNumber(height, 50, 300, 'Height');
    if (parsedHeight.error) { setError(parsedHeight.error); return; }
    const parsedWeight = parseOptionalNumber(weight, 10, 500, 'Weight');
    if (parsedWeight.error) { setError(parsedWeight.error); return; }
    const phoneError = validateMaxLength(phone, PROFILE_FIELD_LIMITS.phone, 'Phone');
    if (phoneError) { setError(phoneError); return; }
    const addressError = validateMaxLength(address, PROFILE_FIELD_LIMITS.address, 'Address');
    if (addressError) { setError(addressError); return; }

    setSaving(true);
    try {
      await session.updateProfile({
        full_name: nextFullName,
        date_of_birth: cleanText(dob),
        gender: sex,
        blood_type: cleanText(bloodType),
        height_cm: parsedHeight.value,
        weight_kg: parsedWeight.value,
        phone: cleanText(phone),
        address: cleanText(address),
      });
      invalidateApiQuery(queryKeys.profile);
      invalidateApiQuery(queryKeys.dashboard);
      invalidateApiQuery(queryKeys.healthGoal);
      setSuccess('Health profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => router.back()} style={styles.backButton}>
            <Text style={[typography.bodyMed, { color: t.brand }]}>Back</Text>
          </Pressable>
          <Text style={[typography.title, { color: t.ink, marginTop: 16 }]}>Health profile</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
            Saved to Core profile and used for dashboard, goals, and medication context.
          </Text>

          {error && <ApiState title="Profile save failed" message={error} />}
          {success && <Text style={[typography.caption, { color: t.success }]}>{success}</Text>}

          <Card style={styles.card}>
            <Input label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" maxLength={PROFILE_FIELD_LIMITS.fullName} />
            <Input label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
            <Text style={[typography.caption, { color: t.ink3 }]}>Biological sex</Text>
            <View style={styles.sexRow}>
              {SEX_OPTIONS.map((opt) => {
                const active = sex === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSex(opt.value)}
                    style={[styles.sexButton, { borderColor: active ? t.brand : t.border, backgroundColor: active ? t.brandSoft : t.card }]}
                  >
                    <Text style={[typography.caption, { color: active ? t.brand : t.ink2 }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Input label="Blood type" value={bloodType} onChangeText={setBloodType} placeholder="O+" autoCapitalize="characters" maxLength={PROFILE_FIELD_LIMITS.bloodType} />
            <View style={styles.measureRow}>
              <Input label="Height" value={height} onChangeText={setHeight} keyboardType="decimal-pad" trailingText="cm" style={styles.measureField} />
              <Input label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" trailingText="kg" style={styles.measureField} />
            </View>
            <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={PROFILE_FIELD_LIMITS.phone} />
            <Input label="Address" value={address} onChangeText={setAddress} maxLength={PROFILE_FIELD_LIMITS.address} />
          </Card>

          <Button label={saving ? 'Saving...' : 'Save profile'} loading={saving} onPress={saveProfile} size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, gap: 16 },
  backButton: { minHeight: 44, minWidth: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  card: { gap: 14 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexButton: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  measureRow: { flexDirection: 'row', gap: 12 },
  measureField: { flex: 1 },
});
