/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HealthProfileScreen } from '../components/profile/health-profile-screen';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import type { MedicalInfo } from '../types/api';

const mockUpdateProfile = jest.fn();
const mockRouterBack = jest.fn();
const defaultMedicalInfo: MedicalInfo = {
  allergies: 'Peanuts',
  chronic_conditions: 'Asthma',
  current_medications: 'Insulin',
  notes: 'Keep emergency card updated.',
};
const defaultInsurance = {
  provider: 'Acme Health',
  policy_number: 'P-99887',
  group_number: 'GRP-001',
};
const mockSessionUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'test',
  display_name: 'Test User',
  avatar_url: null,
  onboarding_status: 'completed',
  onboarding_completed_at: '2026-05-01T00:00:00Z',
  full_name: 'Test User',
  date_of_birth: '1995-04-03',
  gender: 'female',
  blood_type: 'O+',
  height_cm: 168.5,
  weight_kg: 62.5,
  phone: '+84 900 000 000',
  address: 'District 1, Ho Chi Minh City',
  emergency_contacts: [
    {
      name: 'Mom',
      email: 'mom@example.com',
      phone: '+84 888 111 222',
      relationship: 'Mother',
    },
  ],
  medical_info: {
    ...defaultMedicalInfo,
  },
};
const mockTranslation: Record<string, string> = {
  'common.back': 'Back',
  'common.cm': 'cm',
  'common.kg': 'kg',
  'profile.title': 'Health profile',
  'profile.subtitle': 'Health profile details',
  'profile.savedContext': 'Saved to Core profile and used for dashboard, goals, and medication context.',
  'profile.saveFailedTitle': 'Profile save failed',
  'profile.saveSuccess': 'Health profile saved.',
  'profile.saveError': 'Unable to save profile.',
  'profile.saving': 'Saving...',
  'profile.saveProfile': 'Save profile',
  'profile.validationFullNameRequired': 'Full name is required.',
  'profile.validationMaxLength': '{{field}} must be {{max}} characters or fewer.',
  'profile.validationDateFormat': 'Date must be YYYY-MM-DD.',
  'profile.validationDateValid': 'Date must be valid.',
  'profile.validationBirthYear': 'Please enter a valid birth year.',
  'profile.validationPhoneInvalid': 'Phone number format is invalid.',
  'profile.validationNumber': '{{field}} must be a number.',
  'profile.validationRange': '{{field}} must be {{min}}-{{max}}.',
  'profile.fieldFullName': 'Full name',
  'profile.fieldDateOfBirth': 'Date of birth',
  'profile.fieldBiologicalSex': 'Biological sex',
  'profile.fieldBloodType': 'Blood type',
  'profile.bloodTypePlaceholder': 'O+',
  'profile.datePlaceholder': 'YYYY-MM-DD',
  'profile.emergencyContactSection': 'Emergency contact',
  'profile.fieldEmergencyContactName': 'Primary emergency contact name',
  'profile.fieldEmergencyContactPhone': 'Primary emergency contact phone',
  'profile.fieldEmergencyContactEmail': 'Primary emergency contact email (optional)',
  'profile.fieldEmergencyContactRelationship': 'Relationship to you',
  'profile.medicalInfoSection': 'Medical information',
  'profile.fieldAllergies': 'Allergies',
  'profile.fieldChronicConditions': 'Chronic conditions',
  'profile.fieldCurrentMedications': 'Current medications',
  'profile.fieldMedicalNotes': 'Notes',
  'profile.fieldInsuranceProvider': 'Insurance provider',
  'profile.fieldInsurancePolicyNumber': 'Policy number',
  'profile.fieldInsuranceGroupNumber': 'Group number',
  'profile.validationEmergencyContactRequired': 'Primary emergency contact requires name, phone, and relationship.',
  'profile.validationInsuranceProviderPolicyRequired': 'Insurance provider and policy number are required.',
  'profile.validationEmailInvalid': 'Email format is invalid.',
  'profile.fieldHeight': 'Height',
  'profile.fieldWeight': 'Weight',
  'profile.fieldPhone': 'Phone',
  'profile.fieldAddress': 'Address',
  'profile.sexMale': 'Male',
  'profile.sexFemale': 'Female',
  'profile.sexOther': 'Other',
  'profile.emergencyContactLabel': 'Emergency contact #{{n}}',
  'profile.addEmergencyContact': 'Add emergency contact',
  'profile.removeEmergencyContact': 'Remove emergency contact',
};

function mockTranslate(key: string, params?: Record<string, unknown>) {
  const raw = mockTranslation[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, token) => (params[token] ?? `{{${token}}}`).toString());
}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => mockTranslate(key, params) }),
}));

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockRouterBack(...args),
  },
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    user: { ...mockSessionUser },
    updateProfile: mockUpdateProfile,
  }),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

describe('HealthProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionUser.emergency_contacts = [
      {
        name: 'Mom',
        email: 'mom@example.com',
        phone: '+84 888 111 222',
        relationship: 'Mother',
      },
    ];
    mockSessionUser.medical_info = {
      ...defaultMedicalInfo,
    };
    mockUpdateProfile.mockResolvedValue({ id: 'user-1' });
  });

  it('prefills and saves multiple emergency contacts as an array payload', async () => {
    mockSessionUser.emergency_contacts = [
      {
        name: 'Mom',
        email: 'mom@example.com',
        phone: '+84 888 111 222',
        relationship: 'Mother',
      },
      {
        name: 'Dad',
        email: 'dad@example.com',
        phone: '+84 999 555 111',
        relationship: 'Father',
      },
    ];
    const { getByText, getAllByLabelText } = render(<HealthProfileScreen />);

    const names = getAllByLabelText('Primary emergency contact name');
    const phones = getAllByLabelText('Primary emergency contact phone');
    const emails = getAllByLabelText('Primary emergency contact email (optional)');
    const relationships = getAllByLabelText('Relationship to you');
    expect(names).toHaveLength(2);
    expect(phones).toHaveLength(2);
    expect(emails).toHaveLength(2);
    expect(relationships).toHaveLength(2);
    expect(names[0].props.value).toBe('Mom');
    expect(names[1].props.value).toBe('Dad');
    expect(phones[0].props.value).toBe('+84 888 111 222');
    expect(phones[1].props.value).toBe('+84 999 555 111');
    expect(emails[0].props.value).toBe('mom@example.com');
    expect(emails[1].props.value).toBe('dad@example.com');
    expect(relationships[0].props.value).toBe('Mother');
    expect(relationships[1].props.value).toBe('Father');

    fireEvent.changeText(names[1], 'Uncle');
    fireEvent.changeText(phones[1], '+84 555 111 111');
    fireEvent.changeText(emails[1], 'uncle@example.com');
    fireEvent.changeText(relationships[1], 'Uncle');
    fireEvent.press(getByText('Save profile'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
      full_name: 'Test User',
      date_of_birth: '1995-04-03',
      gender: 'female',
      blood_type: 'O+',
      height_cm: 168.5,
      weight_kg: 62.5,
      phone: '+84 900 000 000',
      address: 'District 1, Ho Chi Minh City',
      emergency_contacts: [
        {
          name: 'Mom',
          email: 'mom@example.com',
          phone: '+84 888 111 222',
          relationship: 'Mother',
        },
        {
          name: 'Uncle',
          email: 'uncle@example.com',
          phone: '+84 555 111 111',
          relationship: 'Uncle',
        },
      ],
      medical_info: {
        allergies: 'Peanuts',
        chronic_conditions: 'Asthma',
        current_medications: 'Insulin',
        notes: 'Keep emergency card updated.',
        insurance: null,
      },
    }));
  });

  it('prefills insurance fields from existing Core profile', () => {
    mockSessionUser.medical_info = {
      ...defaultMedicalInfo,
      insurance: {
        ...defaultInsurance,
      },
    };

    const { getByLabelText } = render(<HealthProfileScreen />);

    expect(getByLabelText('Insurance provider').props.value).toBe('Acme Health');
    expect(getByLabelText('Policy number').props.value).toBe('P-99887');
    expect(getByLabelText('Group number').props.value).toBe('GRP-001');
  });

  it('saves insurance fields to medical info payload with optional group number when blank', async () => {
    mockSessionUser.medical_info = {
      ...defaultMedicalInfo,
      insurance: {
        ...defaultInsurance,
      },
    };

    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Insurance provider'), 'Health Plus');
    fireEvent.changeText(getByLabelText('Policy number'), 'PX-123');
    fireEvent.changeText(getByLabelText('Group number'), '');
    fireEvent.press(getByText('Save profile'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
      full_name: 'Test User',
      date_of_birth: '1995-04-03',
      gender: 'female',
      blood_type: 'O+',
      height_cm: 168.5,
      weight_kg: 62.5,
      phone: '+84 900 000 000',
      address: 'District 1, Ho Chi Minh City',
      emergency_contacts: [
        {
          name: 'Mom',
          email: 'mom@example.com',
          phone: '+84 888 111 222',
          relationship: 'Mother',
        },
      ],
      medical_info: {
        allergies: 'Peanuts',
        chronic_conditions: 'Asthma',
        current_medications: 'Insulin',
        notes: 'Keep emergency card updated.',
        insurance: {
          provider: 'Health Plus',
          policy_number: 'PX-123',
          group_number: null,
        },
      },
    }));
  });

  it('clears existing insurance when all insurance fields are blank', async () => {
    mockSessionUser.medical_info = {
      ...defaultMedicalInfo,
      insurance: {
        ...defaultInsurance,
      },
    };

    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Insurance provider'), '');
    fireEvent.changeText(getByLabelText('Policy number'), '');
    fireEvent.changeText(getByLabelText('Group number'), '');

    fireEvent.press(getByText('Save profile'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        medical_info: expect.objectContaining({
          insurance: null,
        }),
      }),
    ));
  });

  it('requires both insurance provider and policy when either is present', () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Policy number'), 'P-99887');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Insurance provider and policy number are required.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('rejects overlong insurance fields before saving profile', () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Insurance provider'), 'a'.repeat(129));
    fireEvent.changeText(getByLabelText('Policy number'), 'P-'.concat('b'.repeat(126)));
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Insurance provider must be 128 characters or fewer.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('blocks save when a contact row is partially filled', () => {
    const { getByText, getAllByLabelText } = render(<HealthProfileScreen />);

    fireEvent.press(getByText('Add emergency contact'));
    const names = getAllByLabelText('Primary emergency contact name');
    expect(names).toHaveLength(2);
    fireEvent.changeText(names[1], 'Uncle');

    fireEvent.press(getByText('Save profile'));
    expect(getByText('Primary emergency contact requires name, phone, and relationship.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('prefills the current Core profile and saves profile updates', async () => {
    const { getByLabelText, getAllByLabelText, getByText } = render(<HealthProfileScreen />);

    expect(getByLabelText('Full name').props.value).toBe('Test User');
    expect(getByLabelText('Date of birth').props.value).toBe('1995-04-03');
    expect(getAllByLabelText('Primary emergency contact name')[0].props.value).toBe('Mom');
    expect(getAllByLabelText('Primary emergency contact phone')[0].props.value).toBe('+84 888 111 222');
    expect(getAllByLabelText('Primary emergency contact email (optional)')[0].props.value).toBe('mom@example.com');
    expect(getAllByLabelText('Relationship to you')[0].props.value).toBe('Mother');
    expect(getByLabelText('Allergies').props.value).toBe('Peanuts');
    expect(getByLabelText('Chronic conditions').props.value).toBe('Asthma');
    expect(getByLabelText('Current medications').props.value).toBe('Insulin');
    expect(getByLabelText('Notes').props.value).toBe('Keep emergency card updated.');

    expect(getByLabelText('Height').props.value).toBe('168.5');
    expect(getByLabelText('Weight').props.value).toBe('62.5');

    fireEvent.changeText(getByLabelText('Height'), '171.5');
    fireEvent.changeText(getByLabelText('Weight'), '64.25');
    fireEvent.changeText(getByLabelText('Phone'), '+84 911 111 111');
    fireEvent.changeText(getAllByLabelText('Primary emergency contact name')[0], 'Dad');
    fireEvent.changeText(getAllByLabelText('Primary emergency contact phone')[0], '+84 777 222 333');
    fireEvent.changeText(getAllByLabelText('Primary emergency contact email (optional)')[0], 'dad@example.com');
    fireEvent.changeText(getAllByLabelText('Relationship to you')[0], 'Father');
    fireEvent.changeText(getByLabelText('Allergies'), 'Dust');
    fireEvent.changeText(getByLabelText('Chronic conditions'), 'Diabetes');
    fireEvent.changeText(getByLabelText('Current medications'), 'Metformin');
    fireEvent.changeText(getByLabelText('Notes'), 'Follow-up in 2 weeks.');
    fireEvent.press(getByText('Save profile'));

    await waitFor(() => expect(getByLabelText('Height').props.value).toBe('171.5'));
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('64.25'));
    await waitFor(() => expect(getByLabelText('Current medications').props.value).toBe('Metformin'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
      full_name: 'Test User',
      date_of_birth: '1995-04-03',
      gender: 'female',
      blood_type: 'O+',
      height_cm: 171.5,
      weight_kg: 64.25,
      phone: '+84 911 111 111',
      address: 'District 1, Ho Chi Minh City',
      emergency_contacts: [
        {
          name: 'Dad',
          email: 'dad@example.com',
          phone: '+84 777 222 333',
          relationship: 'Father',
        },
      ],
      medical_info: {
        allergies: 'Dust',
        chronic_conditions: 'Diabetes',
        current_medications: 'Metformin',
        notes: 'Follow-up in 2 weeks.',
        insurance: null,
      },
    }));

    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.profile);
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.dashboard);
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.healthGoal);
    expect(getByText('Health profile saved.')).toBeTruthy();
  });

  it('requires a non-empty full name before saving', () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Full name'), '   ');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Full name is required.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it.each([
    ['Full name', 'x'.repeat(256), 'Full name must be 255 characters or fewer.'],
    ['Blood type', 'x'.repeat(17), 'Blood type must be 16 characters or fewer.'],
    ['Phone', '1'.repeat(33), 'Phone must be 32 characters or fewer.'],
    ['Address', 'x'.repeat(513), 'Address must be 512 characters or fewer.'],
  ])('blocks %s values longer than Core allows', (fieldLabel, value, message) => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText(fieldLabel), value);
    fireEvent.press(getByText('Save profile'));

    expect(getByText(message)).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('clears stale save success before showing validation errors', async () => {
    const { getByLabelText, getByText, queryByText } = render(<HealthProfileScreen />);

    fireEvent.press(getByText('Save profile'));
    await waitFor(() => expect(getByText('Health profile saved.')).toBeTruthy());

    fireEvent.changeText(getByLabelText('Height'), '999');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Height must be 50-300.')).toBeTruthy();
    expect(queryByText('Health profile saved.')).toBeNull();
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  });

  it('blocks impossible calendar dates before calling Core', () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Date of birth'), '2000-04-31');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Date must be valid.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('blocks invalid height before calling Core', async () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Height'), '999');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Height must be 50-300.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('blocks phone numbers that Core would reject', () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Phone'), 'not-a-phone');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Phone number format is invalid.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('blocks invalid primary emergency contact phone before calling Core', () => {
    const { getAllByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getAllByLabelText('Primary emergency contact phone')[0], 'not-a-phone');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Phone number format is invalid.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('blocks invalid primary emergency contact email before calling Core', () => {
    const { getAllByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getAllByLabelText('Primary emergency contact email (optional)')[0], 'not-an-email');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Email format is invalid.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('accepts Core boundary values for height and weight', async () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Height'), '50');
    fireEvent.changeText(getByLabelText('Weight'), '1');
    await waitFor(() => expect(getByLabelText('Height').props.value).toBe('50'));
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('1'));
    fireEvent.press(getByText('Save profile'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
      height_cm: 50,
      weight_kg: 1,
    })));
  });

  it('returns to previous screen with the top bar back control', () => {
    const { getByLabelText } = render(<HealthProfileScreen />);

    fireEvent.press(getByLabelText('Back'));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('renders no raw i18n keys — profile namespace bug regression', () => {
    const { toJSON } = render(<HealthProfileScreen />);
    const tree = JSON.stringify(toJSON());
    // If any profile.* key appears literally in the output, the namespace is missing from locales
    expect(tree).not.toMatch(/profile\.\w+/);
    // Screen title must resolve to the translated string, not the raw key
    expect(tree).toContain('Health profile');
  });
});
