import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { useSession } from '../../auth/session-provider';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { ChevronLeft, IconPlus, IconTrash } from '../../icons';
import { Button } from '../primitives/button';
import { Card } from '../primitives/card';
import { Input } from '../primitives/input/input';
import { ApiState } from '../api/api-state';

type Sex = 'male' | 'female' | 'other';
type EmergencyContactState = {
  name: string;
  phone: string;
  email: string;
  relationship: string;
};
type MedicalTextField =
  | 'allergies'
  | 'chronic_conditions'
  | 'current_medications'
  | 'notes';
type MedicalInsuranceField = 'provider' | 'policy_number' | 'group_number';

const SEX_OPTIONS: { value: Sex; labelKey: string }[] = [
  { value: 'male', labelKey: 'profile.sexMale' },
  { value: 'female', labelKey: 'profile.sexFemale' },
  { value: 'other', labelKey: 'profile.sexOther' },
];

const DECIMAL_MEASURE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const CORE_PHONE_PATTERN = /^\+?[0-9][0-9\-\s()]{4,18}[0-9]$/;
const CORE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPTY_EMERGENCY_CONTACT: EmergencyContactState = { name: '', phone: '', email: '', relationship: '' };
const PROFILE_FIELD_LIMITS = {
  fullName: 255,
  bloodType: 16,
  insuranceProvider: 128,
  insurancePolicyNumber: 128,
  insuranceGroupNumber: 128,
  phone: 32,
  address: 512,
  emergencyContactName: 120,
  emergencyContactEmail: 254,
  emergencyContactRelationship: 120,
  emergencyContactPhone: 32,
  medicalAllergies: 2000,
  medicalChronicConditions: 2000,
  medicalCurrentMedications: 2000,
  medicalNotes: 4000,
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

function extractMedicalText(raw: unknown, key: MedicalTextField) {
  if (!raw || typeof raw !== 'object') return '';
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function extractInsuranceText(raw: unknown, key: MedicalInsuranceField) {
  if (!raw || typeof raw !== 'object') return '';
  const info = raw as Record<string, unknown>;
  const insurance = info.insurance;
  const source = insurance && typeof insurance === 'object' ? (insurance as Record<string, unknown>) : info;
  const value = source[key];
  return typeof value === 'string' ? value : '';
}

function parseEmergencyContact(raw: unknown): EmergencyContactState {
  if (!raw || typeof raw !== 'object') return { name: '', phone: '', email: '', relationship: '' };
  const contact = raw as Record<string, unknown>;
  return {
    name: typeof contact.name === 'string' ? contact.name : '',
    phone: typeof contact.phone === 'string' ? contact.phone : '',
    email: typeof contact.email === 'string' ? contact.email : '',
    relationship: typeof contact.relationship === 'string' ? contact.relationship : '',
  };
}

function readEmergencyContacts(raw: unknown): EmergencyContactState[] {
  if (!Array.isArray(raw) || raw.length === 0) return [{ name: '', phone: '', email: '', relationship: '' }];
  return raw.map(parseEmergencyContact);
}

export function HealthProfileScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
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
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactState[]>([EMPTY_EMERGENCY_CONTACT]);
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [notes, setNotes] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceGroupNumber, setInsuranceGroupNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const initialAllergies = extractMedicalText(user?.medical_info, 'allergies');
  const initialChronicConditions = extractMedicalText(user?.medical_info, 'chronic_conditions');
  const initialCurrentMedications = extractMedicalText(user?.medical_info, 'current_medications');
  const initialNotes = extractMedicalText(user?.medical_info, 'notes');
  const initialInsuranceProvider = extractInsuranceText(user?.medical_info, 'provider');
  const initialInsurancePolicyNumber = extractInsuranceText(user?.medical_info, 'policy_number');
  const initialInsuranceGroupNumber = extractInsuranceText(user?.medical_info, 'group_number');
  const emergencyContactsSeed = JSON.stringify(user?.emergency_contacts ?? []);

  const normalizedEmergencyContacts = emergencyContacts.map((contact) => ({
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    email: contact.email.trim(),
    relationship: contact.relationship.trim(),
  }));

  useEffect(() => {
    setFullName(user?.full_name ?? user?.display_name ?? '');
    setDob(formDate(user?.date_of_birth));
    setSex(user?.gender ?? null);
    setBloodType(user?.blood_type ?? '');
    setHeight(user?.height_cm ? String(user.height_cm) : '');
    setWeight(user?.weight_kg ? String(user.weight_kg) : '');
    setPhone(user?.phone ?? '');
    setAddress(user?.address ?? '');
    const normalizedEmergencyContacts = readEmergencyContacts(JSON.parse(emergencyContactsSeed) as unknown);
    setEmergencyContacts(
      normalizedEmergencyContacts.length > 0 ? normalizedEmergencyContacts : [EMPTY_EMERGENCY_CONTACT],
    );
    setAllergies(initialAllergies);
    setChronicConditions(initialChronicConditions);
    setCurrentMedications(initialCurrentMedications);
    setNotes(initialNotes);
    setInsuranceProvider(initialInsuranceProvider);
    setInsurancePolicyNumber(initialInsurancePolicyNumber);
    setInsuranceGroupNumber(initialInsuranceGroupNumber);
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
    initialAllergies,
    initialChronicConditions,
    initialCurrentMedications,
    initialNotes,
    initialInsuranceProvider,
    initialInsurancePolicyNumber,
    initialInsuranceGroupNumber,
    emergencyContactsSeed,
  ]);

  function validateMaxLength(value: string, max: number, label: string) {
    if (value.trim().length > max) return i18n('profile.validationMaxLength', { field: label, max });
    return null;
  }

  function validateOptionalPhone(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!CORE_PHONE_PATTERN.test(trimmed)) return i18n('profile.validationPhoneInvalid');
    return null;
  }

  function validateOptionalEmail(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!CORE_EMAIL_PATTERN.test(trimmed)) return i18n('profile.validationEmailInvalid');
    return null;
  }

  function updateEmergencyContact(index: number, field: keyof EmergencyContactState, value: string) {
    setEmergencyContacts((prev) => prev.map((contact, contactIndex) => (
      contactIndex === index ? { ...contact, [field]: value } : contact
    )));
  }

  function addEmergencyContact() {
    setEmergencyContacts((prev) => [...prev, EMPTY_EMERGENCY_CONTACT]);
  }

  function removeEmergencyContact(index: number) {
    setEmergencyContacts((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, contactIndex) => contactIndex !== index);
      return next.length > 0 ? next : [EMPTY_EMERGENCY_CONTACT];
    });
  }

  function parseOptionalNumber(value: string, min: number, max: number, label: string) {
    const trimmed = value.trim();
    if (!trimmed) return { value: null };
    if (!DECIMAL_MEASURE_PATTERN.test(trimmed)) {
      return { error: i18n('profile.validationNumber', { field: label }) };
    }
    const parsed = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      return { error: i18n('profile.validationRange', { field: label, min, max }) };
    }
    return { value: parsed };
  }

  function validateDate(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return i18n('profile.validationDateFormat');
    const date = new Date(`${trimmed}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return i18n('profile.validationDateValid');
    const [, yearPart, monthPart, dayPart] = match;
    if (
      date.getUTCFullYear() !== Number(yearPart)
      || date.getUTCMonth() + 1 !== Number(monthPart)
      || date.getUTCDate() !== Number(dayPart)
    ) {
      return i18n('profile.validationDateValid');
    }
    const year = date.getUTCFullYear();
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 120 || year > currentYear - 13) return i18n('profile.validationBirthYear');
    return null;
  }

  async function saveProfile() {
    const labelFullName = i18n('profile.fieldFullName');
    const labelBloodType = i18n('profile.fieldBloodType');
    const labelHeight = i18n('profile.fieldHeight');
    const labelWeight = i18n('profile.fieldWeight');
    const labelPhone = i18n('profile.fieldPhone');
    const labelEmergencyContactName = i18n('profile.fieldEmergencyContactName');
    const labelEmergencyContactPhone = i18n('profile.fieldEmergencyContactPhone');
    const labelEmergencyContactEmail = i18n('profile.fieldEmergencyContactEmail');
    const labelEmergencyContactRelationship = i18n('profile.fieldEmergencyContactRelationship');
    const labelAllergies = i18n('profile.fieldAllergies');
    const labelChronicConditions = i18n('profile.fieldChronicConditions');
    const labelCurrentMedications = i18n('profile.fieldCurrentMedications');
    const labelMedicalNotes = i18n('profile.fieldMedicalNotes');
    const labelInsuranceProvider = i18n('profile.fieldInsuranceProvider');
    const labelInsurancePolicyNumber = i18n('profile.fieldInsurancePolicyNumber');
    const labelInsuranceGroupNumber = i18n('profile.fieldInsuranceGroupNumber');
    const labelAddress = i18n('profile.fieldAddress');

    setSuccess(null);
    setError(null);

    const nextFullName = fullName.trim();
    if (!nextFullName) {
      setError(i18n('profile.validationFullNameRequired'));
      return;
    }

    const fullNameError = validateMaxLength(nextFullName, PROFILE_FIELD_LIMITS.fullName, labelFullName);
    if (fullNameError) {
      setError(fullNameError);
      return;
    }

    const dateError = validateDate(dob);
    if (dateError) {
      setError(dateError);
      return;
    }

    const bloodTypeError = validateMaxLength(bloodType, PROFILE_FIELD_LIMITS.bloodType, labelBloodType);
    if (bloodTypeError) {
      setError(bloodTypeError);
      return;
    }

    const parsedHeight = parseOptionalNumber(height, 50, 300, labelHeight);
    if (parsedHeight.error) {
      setError(parsedHeight.error);
      return;
    }

    const parsedWeight = parseOptionalNumber(weight, 1, 500, labelWeight);
    if (parsedWeight.error) {
      setError(parsedWeight.error);
      return;
    }

    const phoneError = validateMaxLength(phone, PROFILE_FIELD_LIMITS.phone, labelPhone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    const phoneFormatError = validateOptionalPhone(phone);
    if (phoneFormatError) {
      setError(phoneFormatError);
      return;
    }

    const addressError = validateMaxLength(address, PROFILE_FIELD_LIMITS.address, labelAddress);
    if (addressError) {
      setError(addressError);
      return;
    }

    const completeEmergencyContacts = normalizedEmergencyContacts.filter(
      (contact) => contact.name && contact.phone && contact.relationship,
    );
    const hasEmergencyContactInput = normalizedEmergencyContacts.some(
      (contact) => contact.name || contact.phone || contact.email || contact.relationship,
    );
    const hasIncompleteEmergencyContact = normalizedEmergencyContacts.some(
      (contact) => (contact.name || contact.phone || contact.email || contact.relationship)
      && !(contact.name && contact.phone && contact.relationship),
    );
    if (hasEmergencyContactInput) {
      if (hasIncompleteEmergencyContact) {
        setError(i18n('profile.validationEmergencyContactRequired'));
        return;
      }
      for (const contact of completeEmergencyContacts) {
        const emergencyContactNameError = validateMaxLength(
          contact.name,
          PROFILE_FIELD_LIMITS.emergencyContactName,
          labelEmergencyContactName,
        );
        if (emergencyContactNameError) {
          setError(emergencyContactNameError);
          return;
        }
        const emergencyContactPhoneError = validateMaxLength(
          contact.phone,
          PROFILE_FIELD_LIMITS.emergencyContactPhone,
          labelEmergencyContactPhone,
        );
        if (emergencyContactPhoneError) {
          setError(emergencyContactPhoneError);
          return;
        }
        const emergencyContactPhoneFormatError = validateOptionalPhone(contact.phone);
        if (emergencyContactPhoneFormatError) {
          setError(emergencyContactPhoneFormatError);
          return;
        }
        const emergencyContactEmailLengthError = validateMaxLength(
          contact.email,
          PROFILE_FIELD_LIMITS.emergencyContactEmail,
          labelEmergencyContactEmail,
        );
        if (emergencyContactEmailLengthError) {
          setError(emergencyContactEmailLengthError);
          return;
        }
        const emergencyContactEmailError = validateOptionalEmail(contact.email);
        if (emergencyContactEmailError) {
          setError(emergencyContactEmailError);
          return;
        }
        const emergencyContactRelationshipError = validateMaxLength(
          contact.relationship,
          PROFILE_FIELD_LIMITS.emergencyContactRelationship,
          labelEmergencyContactRelationship,
        );
        if (emergencyContactRelationshipError) {
          setError(emergencyContactRelationshipError);
          return;
        }
      }
    }

    const allergiesError = validateMaxLength(allergies, PROFILE_FIELD_LIMITS.medicalAllergies, labelAllergies);
    if (allergiesError) {
      setError(allergiesError);
      return;
    }
    const chronicConditionsError = validateMaxLength(
      chronicConditions,
      PROFILE_FIELD_LIMITS.medicalChronicConditions,
      labelChronicConditions,
    );
    if (chronicConditionsError) {
      setError(chronicConditionsError);
      return;
    }
    const currentMedicationsError = validateMaxLength(
      currentMedications,
      PROFILE_FIELD_LIMITS.medicalCurrentMedications,
      labelCurrentMedications,
    );
    if (currentMedicationsError) {
      setError(currentMedicationsError);
      return;
    }
    const notesError = validateMaxLength(notes, PROFILE_FIELD_LIMITS.medicalNotes, labelMedicalNotes);
    if (notesError) {
      setError(notesError);
      return;
    }
    const insuranceProviderValue = insuranceProvider.trim();
    const insurancePolicyNumberValue = insurancePolicyNumber.trim();
    const insuranceGroupNumberValue = insuranceGroupNumber.trim();
    const hasInsuranceValue = insuranceProviderValue || insurancePolicyNumberValue || insuranceGroupNumberValue;
    if (hasInsuranceValue) {
      if (!insuranceProviderValue || !insurancePolicyNumberValue) {
        setError(i18n('profile.validationInsuranceProviderPolicyRequired'));
        return;
      }
      const insuranceProviderError = validateMaxLength(
        insuranceProvider,
        PROFILE_FIELD_LIMITS.insuranceProvider,
        labelInsuranceProvider,
      );
      if (insuranceProviderError) {
        setError(insuranceProviderError);
        return;
      }
      const insurancePolicyError = validateMaxLength(
        insurancePolicyNumber,
        PROFILE_FIELD_LIMITS.insurancePolicyNumber,
        labelInsurancePolicyNumber,
      );
      if (insurancePolicyError) {
        setError(insurancePolicyError);
        return;
      }
      const insuranceGroupError = validateMaxLength(
        insuranceGroupNumber,
        PROFILE_FIELD_LIMITS.insuranceGroupNumber,
        labelInsuranceGroupNumber,
      );
      if (insuranceGroupError) {
        setError(insuranceGroupError);
        return;
      }
    }

    setSaving(true);
    try {
      const emergencyContacts = hasEmergencyContactInput ? completeEmergencyContacts : [];
      const emergencyContactsWithEmail = emergencyContacts.map((contact) => {
        if (contact.email) {
          return contact;
        }
        const { email, ...rest } = contact;
        return rest;
      });
      await session.updateProfile({
        full_name: nextFullName,
        date_of_birth: cleanText(dob),
        gender: sex,
        blood_type: cleanText(bloodType),
        height_cm: parsedHeight.value,
        weight_kg: parsedWeight.value,
        phone: cleanText(phone),
        address: cleanText(address),
        emergency_contacts: emergencyContactsWithEmail,
        medical_info: {
          allergies: cleanText(allergies),
          chronic_conditions: cleanText(chronicConditions),
          current_medications: cleanText(currentMedications),
          notes: cleanText(notes),
          insurance: hasInsuranceValue
            ? {
                provider: insuranceProviderValue,
                policy_number: insurancePolicyNumberValue,
                group_number: insuranceGroupNumberValue || null,
              }
            : null,
        },
      });
      invalidateApiQuery(queryKeys.profile);
      invalidateApiQuery(queryKeys.dashboard);
      invalidateApiQuery(queryKeys.healthGoal);
      setSuccess(i18n('profile.saveSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar
          title={i18n('profile.title')}
          left={(
            <IconButton
              variant="subtle"
              icon={<ChevronLeft size={20} color={t.ink3} />}
              onPress={() => router.back()}
              accessibilityLabel={i18n('common.back')}
            />
          )}
        />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[typography.caption, { color: t.ink3 }]}>
            {i18n('profile.subtitle')}
          </Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
            {i18n('profile.savedContext')}
          </Text>

          {error && <ApiState title={i18n('profile.saveFailedTitle')} message={error} />}
          {success && <Text style={[typography.caption, { color: t.success }]}>{success}</Text>}

          <Card style={styles.card}>
            <Input
              label={i18n('profile.fieldFullName')}
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              maxLength={PROFILE_FIELD_LIMITS.fullName}
            />
            <Input
              label={i18n('profile.fieldDateOfBirth')}
              value={dob}
              onChangeText={setDob}
              placeholder={i18n('profile.datePlaceholder')}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={[typography.caption, { color: t.ink3 }]}>
              {i18n('profile.fieldBiologicalSex')}
            </Text>
            <View style={styles.sexRow}>
              {SEX_OPTIONS.map((opt) => {
                const active = sex === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="radio"
                    accessibilityLabel={i18n(opt.labelKey)}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSex(opt.value)}
                    style={[
                      styles.sexButton,
                      {
                        borderColor: active ? t.brand : t.border,
                        backgroundColor: active ? t.brandSoft : t.card,
                      },
                    ]}
                  >
                    <Text style={[typography.caption, { color: active ? t.brand : t.ink2 }]}>
                      {i18n(opt.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Input
              label={i18n('profile.fieldBloodType')}
              value={bloodType}
              onChangeText={setBloodType}
              placeholder={i18n('profile.bloodTypePlaceholder')}
              autoCapitalize="characters"
              maxLength={PROFILE_FIELD_LIMITS.bloodType}
            />
            <View style={styles.measureRow}>
              <Input
                label={i18n('profile.fieldHeight')}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                trailingText={i18n('common.cm')}
                style={styles.measureField}
              />
              <Input
                label={i18n('profile.fieldWeight')}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                trailingText={i18n('common.kg')}
                style={styles.measureField}
              />
            </View>
            <Input
              label={i18n('profile.fieldPhone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={PROFILE_FIELD_LIMITS.phone}
            />
            <Input
              label={i18n('profile.fieldAddress')}
              value={address}
              onChangeText={setAddress}
              maxLength={PROFILE_FIELD_LIMITS.address}
            />
          </Card>
          <Card style={styles.card}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>{i18n('profile.emergencyContactSection')}</Text>
            {emergencyContacts.map((contact, index) => (
              <View key={index} style={[styles.emergencyContactCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={styles.contactHeader}>
                  <Text style={[typography.caption, { color: t.ink3, fontFamily: 'Inter_600SemiBold' }]}>
                    {i18n('profile.emergencyContactLabel', { n: index + 1 })}
                  </Text>
                  {emergencyContacts.length > 1 ? (
                    <IconButton
                      icon={<IconTrash size={16} color={t.danger} />}
                      variant="ghost"
                      size={30}
                      accessibilityLabel={i18n('profile.removeEmergencyContact')}
                      onPress={() => removeEmergencyContact(index)}
                    />
                  ) : null}
                </View>
                <Input
                  label={i18n('profile.fieldEmergencyContactName')}
                  value={contact.name}
                  onChangeText={(value) => updateEmergencyContact(index, 'name', value)}
                  maxLength={PROFILE_FIELD_LIMITS.emergencyContactName}
                  style={{ marginBottom: 12 }}
                />
                <Input
                  label={i18n('profile.fieldEmergencyContactPhone')}
                  value={contact.phone}
                  onChangeText={(value) => updateEmergencyContact(index, 'phone', value)}
                  keyboardType="phone-pad"
                  maxLength={PROFILE_FIELD_LIMITS.emergencyContactPhone}
                  style={{ marginBottom: 12 }}
                />
                <Input
                  label={i18n('profile.fieldEmergencyContactEmail')}
                  value={contact.email}
                  onChangeText={(value) => updateEmergencyContact(index, 'email', value)}
                  placeholder={i18n('auth.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  maxLength={PROFILE_FIELD_LIMITS.emergencyContactEmail}
                  style={{ marginBottom: 12 }}
                />
                <Input
                  label={i18n('profile.fieldEmergencyContactRelationship')}
                  value={contact.relationship}
                  onChangeText={(value) => updateEmergencyContact(index, 'relationship', value)}
                  maxLength={PROFILE_FIELD_LIMITS.emergencyContactRelationship}
                  style={index === emergencyContacts.length - 1 ? undefined : { marginBottom: 12 }}
                />
              </View>
            ))}
            <Button
              label={i18n('profile.addEmergencyContact')}
              variant="ghost"
              size="lg"
              icon={<IconPlus size={16} color={t.brand} />}
              onPress={addEmergencyContact}
            />
          </Card>
          <Card style={styles.card}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>{i18n('profile.medicalInfoSection')}</Text>
            <Input
              label={i18n('profile.fieldAllergies')}
              value={allergies}
              onChangeText={setAllergies}
              maxLength={PROFILE_FIELD_LIMITS.medicalAllergies}
            />
            <Input
              label={i18n('profile.fieldChronicConditions')}
              value={chronicConditions}
              onChangeText={setChronicConditions}
              maxLength={PROFILE_FIELD_LIMITS.medicalChronicConditions}
            />
            <Input
              label={i18n('profile.fieldCurrentMedications')}
              value={currentMedications}
              onChangeText={setCurrentMedications}
              maxLength={PROFILE_FIELD_LIMITS.medicalCurrentMedications}
            />
            <Input
              label={i18n('profile.fieldInsuranceProvider')}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
              maxLength={PROFILE_FIELD_LIMITS.insuranceProvider}
            />
            <Input
              label={i18n('profile.fieldInsurancePolicyNumber')}
              value={insurancePolicyNumber}
              onChangeText={setInsurancePolicyNumber}
              maxLength={PROFILE_FIELD_LIMITS.insurancePolicyNumber}
            />
            <Input
              label={i18n('profile.fieldInsuranceGroupNumber')}
              value={insuranceGroupNumber}
              onChangeText={setInsuranceGroupNumber}
              maxLength={PROFILE_FIELD_LIMITS.insuranceGroupNumber}
            />
            <Input
              label={i18n('profile.fieldMedicalNotes')}
              value={notes}
              onChangeText={setNotes}
              maxLength={PROFILE_FIELD_LIMITS.medicalNotes}
            />
          </Card>

          <Button
            label={saving ? i18n('profile.saving') : i18n('profile.saveProfile')}
            loading={saving}
            onPress={saveProfile}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, gap: 16 },
  card: { gap: 14 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureRow: { flexDirection: 'row', gap: 12 },
  measureField: { flex: 1 },
  emergencyContactCard: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    padding: 12,
    marginBottom: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
