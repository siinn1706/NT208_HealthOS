import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/client';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { Input } from '../primitives/input/input';
import { ProgressBar } from '../primitives/progress-bar';
import { useSession } from '../../auth/session-provider';
import { getPostAuthRoute } from '../../auth/auth-route-policy';
import { onboardingDraftService } from '../../api/services/onboarding-draft-service';
import { IconPlus, IconTrash } from '../../icons';

type Sex = 'male' | 'female' | 'other';
type EmergencyContactState = {
  name: string;
  phone: string;
  email: string;
  relationship: string;
};
type MedicalTextField = 'allergies' | 'chronic_conditions' | 'current_medications' | 'notes';
type MedicalInsuranceField = 'provider' | 'policy_number' | 'group_number';

const DRAFT_DEBOUNCE_MS = 700;
const INSURANCE_FIELD_LIMIT = 128;

const SEX_OPTIONS: { value: Sex; labelKey: string }[] = [
  { value: 'male', labelKey: 'auth.sexMale' },
  { value: 'female', labelKey: 'auth.sexFemale' },
  { value: 'other', labelKey: 'auth.sexOther' },
];
const EMPTY_EMERGENCY_CONTACT: EmergencyContactState = {
  name: '',
  phone: '',
  email: '',
  relationship: '',
};
const CORE_PHONE_PATTERN = /^\+?[0-9][0-9\-\s()]{4,18}[0-9]$/;
const CORE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CORE_DECIMAL_MEASURE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const AUTH_SETUP_FIELD_LIMITS = {
  fullName: 255,
  bloodType: 16,
  emergencyContactName: 120,
  emergencyContactPhone: 32,
  emergencyContactEmail: 254,
  emergencyContactRelationship: 120,
  medicalAllergies: 2000,
  medicalChronicConditions: 2000,
  medicalCurrentMedications: 2000,
  medicalNotes: 4000,
  insuranceProvider: INSURANCE_FIELD_LIMIT,
  insurancePolicyNumber: INSURANCE_FIELD_LIMIT,
  insuranceGroupNumber: INSURANCE_FIELD_LIMIT,
  phone: 32,
  address: 512,
} as const;
const AUTH_SETUP_HEIGHT_CM = { min: 50, max: 300 } as const;
const AUTH_SETUP_WEIGHT_KG = { min: 1, max: 500 } as const;

export function AuthSetupScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const session = useSession();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const skipDraftSaveRef = useRef(false);
  const normalizedEmergencyContacts = emergencyContacts.map((contact) => ({
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    email: contact.email.trim(),
    relationship: contact.relationship.trim(),
  }));

  const buildEmergencyContactPayload = useCallback(() => {
    return normalizedEmergencyContacts
      .filter((c) => c.name && c.phone && c.relationship)
      .map((c) => {
        const emergencyContact = {
          name: c.name,
          phone: c.phone,
          relationship: c.relationship,
        };
        if (!c.email) {
          return emergencyContact;
        }
        return {
          ...emergencyContact,
          email: c.email,
        };
      });
  }, [normalizedEmergencyContacts]);

  const buildDraftEmergencyContactsPayload = useCallback(() => {
    return normalizedEmergencyContacts
      .filter((c) => c.name || c.phone || c.email || c.relationship)
      .map((c) => ({ ...c }));
  }, [normalizedEmergencyContacts]);

  const buildDraftMedicalInfoPayload = useCallback(() => {
    const provider = toDraftFieldText(insuranceProvider);
    const policyNumber = toDraftFieldText(insurancePolicyNumber);
    const groupNumber = toDraftFieldText(insuranceGroupNumber);
    const hasInsuranceValue = provider || policyNumber || groupNumber;
    const insurance = hasInsuranceValue
      ? {
          provider,
          policy_number: policyNumber,
          group_number: groupNumber || null,
        }
      : null;

    return {
      allergies: cleanText(allergies),
      chronic_conditions: cleanText(chronicConditions),
      current_medications: cleanText(currentMedications),
      notes: cleanText(notes),
      ...(insurance ? { insurance } : {}),
    };
  }, [allergies, chronicConditions, currentMedications, insuranceGroupNumber, insurancePolicyNumber, insuranceProvider, notes]);

  const buildMedicalInfoPayload = useCallback(() => {
    const provider = insuranceProvider.trim();
    const policyNumber = insurancePolicyNumber.trim();
    const groupNumber = insuranceGroupNumber.trim();
    if (!provider && !policyNumber && !groupNumber) {
      return {
        allergies: cleanText(allergies),
        chronic_conditions: cleanText(chronicConditions),
        current_medications: cleanText(currentMedications),
        notes: cleanText(notes),
        insurance: null,
      };
    }
    return {
      allergies: cleanText(allergies),
      chronic_conditions: cleanText(chronicConditions),
      current_medications: cleanText(currentMedications),
      notes: cleanText(notes),
      insurance: {
        provider,
        policy_number: policyNumber,
        group_number: groupNumber || null,
      },
    };
  }, [allergies, chronicConditions, currentMedications, insuranceGroupNumber, insurancePolicyNumber, insuranceProvider, notes]);

  const buildDraftPayload = useCallback(() => {
    return {
      full_name: cleanText(fullName),
      date_of_birth: normalizeDate(dob),
      gender: sex,
      height_cm: parseHeightWeightValue(height),
      weight_kg: parseHeightWeightValue(weight),
      phone: phone.trim() ? phone.trim() : null,
      address: address.trim() ? address.trim() : null,
      blood_type: normalizeBloodType(bloodType),
      emergency_contacts: buildDraftEmergencyContactsPayload(),
      medical_info: buildDraftMedicalInfoPayload(),
    };
  }, [
    buildDraftMedicalInfoPayload,
    bloodType,
    buildDraftEmergencyContactsPayload,
    fullName,
    address,
    dob,
    height,
    phone,
    sex,
    weight,
  ]);

  const createEmptyEmergencyContact = useCallback(() => ({ ...EMPTY_EMERGENCY_CONTACT }), []);

  const updateEmergencyContact = useCallback((index: number, field: keyof EmergencyContactState, value: string) => {
    setEmergencyContacts((prev) => prev.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)));
  }, []);

  const addEmergencyContact = useCallback(() => {
    setEmergencyContacts((prev) => [...prev, createEmptyEmergencyContact()]);
  }, [createEmptyEmergencyContact]);

  const removeEmergencyContact = useCallback((index: number) => {
    setEmergencyContacts((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createEmptyEmergencyContact()];
    });
  }, [createEmptyEmergencyContact]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const draft = await onboardingDraftService.getDraft();
        if (!active) return;
        const data = draft?.data;
        if (!data || typeof data !== 'object') return;

        skipDraftSaveRef.current = true;
        setFullName(getDraftFieldString((data as { full_name?: unknown }).full_name));
        setDob(formatDateForInput(getDraftFieldString((data as { date_of_birth?: unknown }).date_of_birth)));
        setSex(parseSex((data as { gender?: unknown }).gender));
        setHeight(getDraftFieldString((data as { height_cm?: unknown }).height_cm));
        setWeight(getDraftFieldString((data as { weight_kg?: unknown }).weight_kg));
        setPhone(getDraftFieldString((data as { phone?: unknown }).phone));
        setAddress(getDraftFieldString((data as { address?: unknown }).address));
        setBloodType(getDraftFieldString((data as { blood_type?: unknown }).blood_type));
        const emergencyContactsValue = readEmergencyContacts((data as { emergency_contacts?: unknown }).emergency_contacts);
        setEmergencyContacts(emergencyContactsValue);
        setAllergies(extractMedicalText((data as { medical_info?: unknown }).medical_info, 'allergies'));
        setChronicConditions(extractMedicalText((data as { medical_info?: unknown }).medical_info, 'chronic_conditions'));
        setCurrentMedications(extractMedicalText((data as { medical_info?: unknown }).medical_info, 'current_medications'));
        setNotes(extractMedicalText((data as { medical_info?: unknown }).medical_info, 'notes'));
        setInsuranceProvider(extractInsuranceText((data as { medical_info?: unknown }).medical_info, 'provider'));
        setInsurancePolicyNumber(extractInsuranceText((data as { medical_info?: unknown }).medical_info, 'policy_number'));
        setInsuranceGroupNumber(extractInsuranceText((data as { medical_info?: unknown }).medical_info, 'group_number'));
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          if (__DEV__) {
            console.warn('[AuthSetupScreen] Unable to load onboarding draft.', err);
          }
        }
      } finally {
        if (active) {
          setDraftHydrated(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      onboardingDraftService
        .saveDraft({
          data: buildDraftPayload(),
        })
        .catch((error) => {
          if (__DEV__) {
            console.warn('[AuthSetupScreen] Unable to save onboarding draft.', error);
          }
        });
    }, DRAFT_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [
    address,
    allergies,
    chronicConditions,
    currentMedications,
    dob,
    draftHydrated,
    emergencyContacts,
    height,
    notes,
    phone,
    sex,
    weight,
    buildDraftPayload,
  ]);

  async function handleFinish() {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedUser = await session.updateProfile({
        full_name: fullName.trim(),
        date_of_birth: normalizeDate(dob),
        gender: sex,
        height_cm: parseHeightWeightValue(height),
        weight_kg: parseHeightWeightValue(weight),
        phone: phone.trim() ? phone.trim() : null,
        address: address.trim() ? address.trim() : null,
        blood_type: normalizeBloodType(bloodType),
        emergency_contacts: buildEmergencyContactPayload(),
        medical_info: buildMedicalInfoPayload(),
        onboarding_completed: true,
      });
      try {
        await onboardingDraftService.clearDraft();
      } catch (error) {
        if (__DEV__) {
          console.warn('[AuthSetupScreen] Unable to clear onboarding draft.', error);
        }
      }
      router.replace(getPostAuthRoute(updatedUser.onboarding_status) as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('auth.setupSaveFailed'));
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    const fullNameValue = fullName.trim();
    if (!fullNameValue) return i18n('profile.validationFullNameRequired');
    const fullNameError = validateMaxLength(fullNameValue, AUTH_SETUP_FIELD_LIMITS.fullName, i18n('profile.fieldFullName'));
    if (fullNameError) return fullNameError;
    const bloodTypeError = validateMaxLength(
      bloodType.trim(),
      AUTH_SETUP_FIELD_LIMITS.bloodType,
      i18n('profile.fieldBloodType'),
    );
    if (bloodTypeError) return bloodTypeError;
    const dobValue = dob.trim();
    if (!dobValue) return `${i18n('profile.fieldDateOfBirth')} ${i18n('forms.required')}`;
    const parsedDob = normalizeDate(dobValue);
    if (!parsedDob || !isValidIsoDate(parsedDob)) return i18n('auth.setupDateFormatError');
    const year = Number.parseInt(parsedDob.slice(0, 4), 10);
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 120 || year > currentYear - 13) return i18n('auth.setupBirthYearError');

    if (!sex) {
      return `${i18n('auth.biologicalSex')} ${i18n('forms.required')}`;
    }
    const phoneTrimmed = phone.trim();
    if (phoneTrimmed.length > AUTH_SETUP_FIELD_LIMITS.phone) {
      return i18n('profile.validationMaxLength', {
        field: i18n('profile.fieldPhone'),
        max: AUTH_SETUP_FIELD_LIMITS.phone,
      });
    }
    if (!phoneTrimmed) return i18n('auth.setupPhoneRequired');
    if (phoneTrimmed && !CORE_PHONE_PATTERN.test(phoneTrimmed)) return i18n('profile.validationPhoneInvalid');
    if (address.trim().length > AUTH_SETUP_FIELD_LIMITS.address) {
      return i18n('profile.validationMaxLength', {
        field: i18n('profile.fieldAddress'),
        max: AUTH_SETUP_FIELD_LIMITS.address,
      });
    }
    const heightValue = height.trim();
    if (!heightValue) return `${i18n('auth.height')} ${i18n('forms.required')}`;
    const heightValidationError = validateMeasureRange(heightValue, AUTH_SETUP_HEIGHT_CM, i18n('profile.fieldHeight'));
    if (heightValidationError) {
      return heightValidationError;
    }
    const weightValue = weight.trim();
    if (!weightValue) return `${i18n('auth.weight')} ${i18n('forms.required')}`;
    const weightValidationError = validateMeasureRange(weightValue, AUTH_SETUP_WEIGHT_KG, i18n('profile.fieldWeight'));
    if (weightValidationError) {
      return weightValidationError;
    }
    const completeEmergencyContacts = normalizedEmergencyContacts.filter(
      (contact) => contact.name && contact.phone && contact.relationship,
    );
    if (completeEmergencyContacts.length === 0) {
      return i18n('profile.validationEmergencyContactRequired');
    }
    const hasIncompleteContact = normalizedEmergencyContacts.some(
      (contact) => {
        const hasAnyValue = Boolean(contact.name || contact.phone || contact.email || contact.relationship);
        const hasAllValues = Boolean(contact.name && contact.phone && contact.relationship);
        return hasAnyValue && !hasAllValues;
      },
    );
    if (hasIncompleteContact) {
      return i18n('profile.validationEmergencyContactRequired');
    }
    const emergencyContactLabel = i18n('profile.fieldEmergencyContactName');
    const emergencyContactPhoneLabel = i18n('profile.fieldEmergencyContactPhone');
    const emergencyContactEmailLabel = i18n('profile.fieldEmergencyContactEmail');
    const emergencyContactRelationshipLabel = i18n('profile.fieldEmergencyContactRelationship');
    for (const contact of completeEmergencyContacts) {
      const emergencyContactNameError = validateMaxLength(
        contact.name,
        AUTH_SETUP_FIELD_LIMITS.emergencyContactName,
        emergencyContactLabel,
      );
      if (emergencyContactNameError) {
        return emergencyContactNameError;
      }
      const emergencyContactPhoneError = validateMaxLength(
        contact.phone,
        AUTH_SETUP_FIELD_LIMITS.emergencyContactPhone,
        emergencyContactPhoneLabel,
      );
      if (emergencyContactPhoneError) {
        return emergencyContactPhoneError;
      }
      if (!CORE_PHONE_PATTERN.test(contact.phone)) {
        return i18n('profile.validationPhoneInvalid');
      }
      const emergencyContactEmailLengthError = validateMaxLength(
        contact.email,
        AUTH_SETUP_FIELD_LIMITS.emergencyContactEmail,
        emergencyContactEmailLabel,
      );
      if (emergencyContactEmailLengthError) {
        return `${emergencyContactEmailLabel}: ${emergencyContactEmailLengthError}`;
      }
      const emergencyContactEmailError = validateOptionalEmail(contact.email);
      if (emergencyContactEmailError) {
        return `${emergencyContactEmailLabel}: ${emergencyContactEmailError}`;
      }
      const emergencyContactRelationshipError = validateMaxLength(
        contact.relationship,
        AUTH_SETUP_FIELD_LIMITS.emergencyContactRelationship,
        emergencyContactRelationshipLabel,
      );
      if (emergencyContactRelationshipError) {
        return emergencyContactRelationshipError;
      }
    }
    const allergiesError = validateMaxLength(
      allergies.trim(),
      AUTH_SETUP_FIELD_LIMITS.medicalAllergies,
      i18n('profile.fieldAllergies'),
    );
    if (allergiesError) return allergiesError;
    const chronicConditionsError = validateMaxLength(
      chronicConditions.trim(),
      AUTH_SETUP_FIELD_LIMITS.medicalChronicConditions,
      i18n('profile.fieldChronicConditions'),
    );
    if (chronicConditionsError) return chronicConditionsError;
    const currentMedicationsError = validateMaxLength(
      currentMedications.trim(),
      AUTH_SETUP_FIELD_LIMITS.medicalCurrentMedications,
      i18n('profile.fieldCurrentMedications'),
    );
    if (currentMedicationsError) return currentMedicationsError;
    const notesError = validateMaxLength(
      notes.trim(),
      AUTH_SETUP_FIELD_LIMITS.medicalNotes,
      i18n('profile.fieldMedicalNotes'),
    );
    if (notesError) return notesError;
    const insuranceProviderValue = insuranceProvider.trim();
    const insurancePolicyNumberValue = insurancePolicyNumber.trim();
    const insuranceGroupNumberValue = insuranceGroupNumber.trim();
    const hasInsuranceValue = insuranceProviderValue || insurancePolicyNumberValue || insuranceGroupNumberValue;
    if (hasInsuranceValue) {
      if (!insuranceProviderValue || !insurancePolicyNumberValue) {
        return i18n('profile.validationInsuranceProviderPolicyRequired');
      }
      const insuranceProviderError = validateMaxLength(
        insuranceProviderValue,
        AUTH_SETUP_FIELD_LIMITS.insuranceProvider,
        i18n('profile.fieldInsuranceProvider'),
      );
      if (insuranceProviderError) return insuranceProviderError;
      const insurancePolicyError = validateMaxLength(
        insurancePolicyNumberValue,
        AUTH_SETUP_FIELD_LIMITS.insurancePolicyNumber,
        i18n('profile.fieldInsurancePolicyNumber'),
      );
      if (insurancePolicyError) return insurancePolicyError;
      const insuranceGroupError = validateMaxLength(
        insuranceGroupNumberValue,
        AUTH_SETUP_FIELD_LIMITS.insuranceGroupNumber,
        i18n('profile.fieldInsuranceGroupNumber'),
      );
      if (insuranceGroupError) return insuranceGroupError;
    }
    return null;
  }

  function validateMaxLength(value: string, max: number, field: string) {
    if (value.length > max) {
      return i18n('profile.validationMaxLength', { field, max });
    }
    return null;
  }

  function validateMeasureRange(value: string, range: { min: number; max: number }, label: string) {
    if (!CORE_DECIMAL_MEASURE_PATTERN.test(value)) {
      return i18n('profile.validationNumber', { field: label });
    }
    const parsedValue = Number(value.replace(',', '.'));
    if (Number.isNaN(parsedValue) || parsedValue < range.min || parsedValue > range.max) {
      return i18n('profile.validationRange', {
        field: label,
        min: range.min,
        max: range.max,
      });
    }
    return null;
  }

  function cleanText(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  function parseHeightWeightValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Number(trimmed.replace(',', '.'));
  }

  function validateOptionalEmail(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!CORE_EMAIL_PATTERN.test(trimmed)) {
      return i18n('profile.validationEmailInvalid');
    }
    return null;
  }

  function normalizeBloodType(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  function toDraftFieldText(value: string) {
    return value.trim();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 20 }}>
          <ProgressBar segments={5} filled={2} height={6} />
        </View>

        <Text
          style={[
            typography.micro,
            {
              color: t.ink3,
              fontFamily: 'Inter_700Bold',
              letterSpacing: 1.4,
              lineHeight: 14,
              marginBottom: 6,
            },
          ]}
        >
          {i18n('auth.setupStepBodyBasics')}
        </Text>

        <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>{i18n('auth.setupBodyTitle')}</Text>

        <Text style={[typography.caption, { color: t.ink3, marginBottom: 20 }]}> {i18n('auth.setupBodySubtitle')} </Text>

        {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

        <Input
          label={i18n('profile.fieldFullName')}
          value={fullName}
          onChangeText={setFullName}
          maxLength={AUTH_SETUP_FIELD_LIMITS.fullName}
          style={{ marginBottom: 16 }}
        />
        <Input
          label={i18n('profile.fieldBloodType')}
          value={bloodType}
          onChangeText={setBloodType}
          placeholder={i18n('profile.bloodTypePlaceholder')}
          autoCapitalize="characters"
          maxLength={AUTH_SETUP_FIELD_LIMITS.bloodType}
          style={{ marginBottom: 16 }}
        />
        <View style={{ marginBottom: 16 }}>
          <Input
            label={i18n('auth.dateOfBirth')}
            value={dob}
            onChangeText={setDob}
            placeholder="DD/MM/YYYY"
            keyboardType="numbers-and-punctuation"
            trailingIcon={<Calendar size={18} color={t.ink3} />}
          />
        </View>

        <Text style={[typography.caption, { color: t.ink3, marginBottom: 8 }]}>{i18n('auth.biologicalSex')}</Text>
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
                accessibilityLabel={i18n(opt.labelKey)}
              >
                <Text style={[typography.body, { fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular', color: active ? t.brand : t.ink2 }]}>
                  {i18n(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={styles.measureField}>
            <Input
              label={i18n('auth.height')}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="170"
              trailingText="cm"
            />
          </View>
          <View style={styles.measureField}>
            <Input
              label={i18n('auth.weight')}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="65"
              trailingText="kg"
            />
          </View>
        </View>
        <Input
          label={i18n('profile.fieldPhone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={AUTH_SETUP_FIELD_LIMITS.phone}
          style={{ marginBottom: 16 }}
        />
        <Input
          label={i18n('profile.fieldAddress')}
          value={address}
          onChangeText={setAddress}
          maxLength={AUTH_SETUP_FIELD_LIMITS.address}
          style={{ marginBottom: 16 }}
        />
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 8 }]}>
          {i18n('profile.emergencyContactSection')}
        </Text>
        {emergencyContacts.map((contact, index) => (
          <View key={index} style={[styles.contactCard, { backgroundColor: t.card, borderColor: t.border }]}>
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
              maxLength={AUTH_SETUP_FIELD_LIMITS.emergencyContactName}
              style={{ marginBottom: 12 }}
            />
            <Input
              label={i18n('profile.fieldEmergencyContactPhone')}
              value={contact.phone}
              onChangeText={(value) => updateEmergencyContact(index, 'phone', value)}
              keyboardType="phone-pad"
              maxLength={AUTH_SETUP_FIELD_LIMITS.emergencyContactPhone}
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
              maxLength={AUTH_SETUP_FIELD_LIMITS.emergencyContactEmail}
              style={{ marginBottom: 12 }}
            />
            <Input
              label={i18n('profile.fieldEmergencyContactRelationship')}
              value={contact.relationship}
              onChangeText={(value) => updateEmergencyContact(index, 'relationship', value)}
              maxLength={AUTH_SETUP_FIELD_LIMITS.emergencyContactRelationship}
              style={{ marginBottom: 16 }}
            />
          </View>
        ))}
        <Button
          label={i18n('profile.addEmergencyContact')}
          variant="ghost"
          size="lg"
          icon={<IconPlus size={16} color={t.brand} />}
          onPress={addEmergencyContact}
          style={{ marginBottom: 12 }}
        />
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 8 }]}>
          {i18n('profile.medicalInfoSection')}
        </Text>
        <Input
          label={i18n('profile.fieldAllergies')}
          value={allergies}
          onChangeText={setAllergies}
          maxLength={AUTH_SETUP_FIELD_LIMITS.medicalAllergies}
          style={{ marginBottom: 12 }}
        />
        <Input
          label={i18n('profile.fieldChronicConditions')}
          value={chronicConditions}
          onChangeText={setChronicConditions}
          maxLength={AUTH_SETUP_FIELD_LIMITS.medicalChronicConditions}
          style={{ marginBottom: 12 }}
        />
        <Input
          label={i18n('profile.fieldCurrentMedications')}
          value={currentMedications}
          onChangeText={setCurrentMedications}
          maxLength={AUTH_SETUP_FIELD_LIMITS.medicalCurrentMedications}
          style={{ marginBottom: 12 }}
        />
        <Input
          label={i18n('profile.fieldInsuranceProvider')}
          value={insuranceProvider}
          onChangeText={setInsuranceProvider}
          maxLength={AUTH_SETUP_FIELD_LIMITS.insuranceProvider}
          style={{ marginBottom: 12 }}
        />
        <Input
          label={i18n('profile.fieldInsurancePolicyNumber')}
          value={insurancePolicyNumber}
          onChangeText={setInsurancePolicyNumber}
          maxLength={AUTH_SETUP_FIELD_LIMITS.insurancePolicyNumber}
          style={{ marginBottom: 12 }}
        />
        <Input
          label={i18n('profile.fieldInsuranceGroupNumber')}
          value={insuranceGroupNumber}
          onChangeText={setInsuranceGroupNumber}
          maxLength={AUTH_SETUP_FIELD_LIMITS.insuranceGroupNumber}
          style={{ marginBottom: 12 }}
        />
        <Input
          label={i18n('profile.fieldMedicalNotes')}
          value={notes}
          onChangeText={setNotes}
          maxLength={AUTH_SETUP_FIELD_LIMITS.medicalNotes}
          style={{ marginBottom: 16 }}
        />

        <Button label={i18n('auth.continueSetup')} size="lg" loading={loading} onPress={handleFinish} style={{ marginTop: 8 }} />
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

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function formatDateForInput(rawDate: string) {
  const trimmed = rawDate.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

function getDraftFieldString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function parseSex(value: unknown): Sex | null {
  if (value === 'male' || value === 'female' || value === 'other') {
    return value;
  }
  return null;
}

function parseEmergencyContact(raw: unknown): EmergencyContactState {
  if (!raw || typeof raw !== 'object') {
    return { name: '', phone: '', email: '', relationship: '' };
  }
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

function extractMedicalText(raw: unknown, key: MedicalTextField) {
  if (!raw || typeof raw !== 'object') return '';
  const info = raw as Record<string, unknown>;
  return typeof info[key] === 'string' ? info[key] : '';
}

function extractInsuranceText(raw: unknown, key: MedicalInsuranceField) {
  if (!raw || typeof raw !== 'object') return '';
  const info = raw as Record<string, unknown>;
  const insurance = info.insurance;
  const source = insurance && typeof insurance === 'object' ? insurance as Record<string, unknown> : info;
  return typeof source[key] === 'string' ? source[key] : '';
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  sexRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sexBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  measureField: { flex: 1 },
  contactCard: {
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
