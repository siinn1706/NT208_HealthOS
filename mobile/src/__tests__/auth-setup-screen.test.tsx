/* eslint-env jest */
import React from 'react';
import { router } from 'expo-router';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ApiError } from '../api/client';
import { AuthSetupScreen } from '../components/auth/auth-setup-screen';
import { onboardingDraftService } from '../api/services/onboarding-draft-service';
import { useSession } from '../auth/session-provider';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../api/services/onboarding-draft-service', () => ({
  onboardingDraftService: {
    getDraft: jest.fn(),
    saveDraft: jest.fn(),
    clearDraft: jest.fn(),
  },
}));

jest.mock('../auth/session-provider', () => ({
  useSession: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockGetDraft = onboardingDraftService.getDraft as jest.MockedFunction<typeof onboardingDraftService.getDraft>;
const mockSaveDraft = onboardingDraftService.saveDraft as jest.MockedFunction<typeof onboardingDraftService.saveDraft>;
const mockClearDraft = onboardingDraftService.clearDraft as jest.MockedFunction<typeof onboardingDraftService.clearDraft>;
const mockRouterReplace = router.replace as jest.MockedFunction<typeof router.replace>;

type SessionContextLike = Parameters<typeof mockUseSession.mockReturnValue>[0];

function setSessionMocks(overrides: Partial<SessionContextLike> = {}) {
  mockUseSession.mockReturnValue({
    user: null,
    booting: false,
    authenticated: true,
    error: null,
    signIn: jest.fn(),
    signInWithOAuth: jest.fn(),
    completeMfaSignIn: jest.fn(),
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    updateProfile: jest.fn(),
    clearSession: jest.fn(),
    ...overrides,
  });
}

async function renderScreen() {
  const screen = render(<AuthSetupScreen />);
  await waitFor(() => expect(mockGetDraft).toHaveBeenCalled());
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSession.mockReset();
  mockGetDraft.mockRejectedValue(new ApiError('Not found', 404, 'NOT_FOUND'));
  mockSaveDraft.mockResolvedValue({
    data: {},
    updated_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2026-01-08T00:00:00.000Z',
  });
  mockClearDraft.mockResolvedValue(undefined as never);
  mockRouterReplace.mockClear();
  setSessionMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AuthSetupScreen', () => {
  it('loads multiple emergency contacts from draft and submits all of them', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    mockGetDraft.mockResolvedValueOnce({
      data: {
        full_name: 'Alex Nguyen',
        date_of_birth: '1990-01-01',
        gender: 'female',
        height_cm: 170,
        weight_kg: 65,
        phone: '+84 901 234 567',
        address: 'District 1, Ho Chi Minh City',
        blood_type: 'A+',
        emergency_contacts: [
          {
            name: 'Dad',
            email: 'dad@example.com',
            phone: '+84 901 234 568',
            relationship: 'Father',
          },
          {
            name: 'Mom',
            email: 'mom@example.com',
            phone: '+84 901 234 569',
            relationship: 'Mother',
          },
        ],
        medical_info: {
          allergies: 'Peanuts',
          chronic_conditions: 'Asthma',
          current_medications: 'Metformin',
          notes: 'Allergic to nuts.',
          insurance: {
            provider: 'Acme Health',
            policy_number: 'P-99887',
            group_number: 'GRP-001',
          },
        },
      },
      updated_at: '2026-01-01T00:00:00.000Z',
      expires_at: '2026-01-08T00:00:00.000Z',
    });

    const { getByDisplayValue, getByText } = await renderScreen();

    expect(getByDisplayValue('Alex Nguyen')).toBeTruthy();
    expect(getByDisplayValue('A+')).toBeTruthy();
    await waitFor(() => expect(getByDisplayValue('01/01/1990')).toBeTruthy());
    expect(getByDisplayValue('170')).toBeTruthy();
    expect(getByDisplayValue('65')).toBeTruthy();
    expect(getByDisplayValue('+84 901 234 567')).toBeTruthy();
    expect(getByDisplayValue('District 1, Ho Chi Minh City')).toBeTruthy();
    expect(getByDisplayValue('Dad')).toBeTruthy();
    expect(getByDisplayValue('+84 901 234 568')).toBeTruthy();
    expect(getByDisplayValue('dad@example.com')).toBeTruthy();
    expect(getByDisplayValue('Father')).toBeTruthy();
    expect(getByDisplayValue('Mom')).toBeTruthy();
    expect(getByDisplayValue('+84 901 234 569')).toBeTruthy();
    expect(getByDisplayValue('mom@example.com')).toBeTruthy();
    expect(getByDisplayValue('Mother')).toBeTruthy();
    expect(getByDisplayValue('Peanuts')).toBeTruthy();
    expect(getByDisplayValue('Asthma')).toBeTruthy();
    expect(getByDisplayValue('Metformin')).toBeTruthy();
    expect(getByDisplayValue('Allergic to nuts.')).toBeTruthy();
    expect(getByDisplayValue('Acme Health')).toBeTruthy();
    expect(getByDisplayValue('P-99887')).toBeTruthy();
    expect(getByDisplayValue('GRP-001')).toBeTruthy();

    fireEvent.press(getByText('auth.continueSetup'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        full_name: 'Alex Nguyen',
        date_of_birth: '1990-01-01',
        gender: 'female',
        height_cm: 170,
        weight_kg: 65,
        phone: '+84 901 234 567',
        address: 'District 1, Ho Chi Minh City',
        blood_type: 'A+',
        emergency_contacts: [
          {
            name: 'Dad',
            email: 'dad@example.com',
            phone: '+84 901 234 568',
            relationship: 'Father',
          },
          {
            name: 'Mom',
            email: 'mom@example.com',
            phone: '+84 901 234 569',
            relationship: 'Mother',
          },
        ],
        medical_info: {
          allergies: 'Peanuts',
          chronic_conditions: 'Asthma',
          current_medications: 'Metformin',
          notes: 'Allergic to nuts.',
          insurance: {
            provider: 'Acme Health',
            policy_number: 'P-99887',
            group_number: 'GRP-001',
          },
        },
        onboarding_completed: true,
      });
      expect(mockClearDraft).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith('/home');
    });
  });

  it('rejects out-of-range height and weight values', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '49');
    fireEvent.changeText(getByLabelText('auth.weight'), '0');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 222 333');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.press(getByText('auth.continueSetup'));

    expect(updateProfile).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(getByText('profile.validationRange')).toBeTruthy();
  });

  it('accepts minimum boundary height and weight values', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '50');
    fireEvent.changeText(getByLabelText('auth.weight'), '1');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 222 333');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.press(getByText('auth.continueSetup'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          height_cm: 50,
          weight_kg: 1,
        }),
      );
    });
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/home');
  });

  it('accepts maximum boundary height and weight values', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '300');
    fireEvent.changeText(getByLabelText('auth.weight'), '500');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 222 333');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.press(getByText('auth.continueSetup'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          height_cm: 300,
          weight_kg: 500,
        }),
      );
    });
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/home');
  });

  it('requires required onboarding basics before emergency contact', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('profile.validationFullNameRequired')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();

    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');

    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('profile.validationEmergencyContactRequired')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('blocks required onboarding basics that are still missing', async () => {
    const updateProfile = jest.fn();
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 111 111');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');

    fireEvent.press(getByText('auth.continueSetup'));
    expect(getByText('profile.fieldDateOfBirth forms.required')).toBeTruthy();

    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.continueSetup'));
    expect(getByText('auth.biologicalSex forms.required')).toBeTruthy();

    fireEvent.press(getByText('auth.sexMale'));
    fireEvent.press(getByText('auth.continueSetup'));
    expect(getByText('auth.height forms.required')).toBeTruthy();

    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.press(getByText('auth.continueSetup'));
    expect(getByText('auth.weight forms.required')).toBeTruthy();
  });

  it('omits blank optional emergency email from outbound payload', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('profile.fieldBloodType'), 'ab-');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 111 222');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactEmail'), '   ');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.press(getByText('auth.continueSetup'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        full_name: 'Alex Nguyen',
        date_of_birth: '1990-01-01',
        gender: 'female',
        height_cm: 170,
        weight_kg: 65,
        phone: '+84 901 234 567',
        address: null,
        blood_type: 'AB-',
        emergency_contacts: [
          {
            name: 'Mom',
            phone: '+84 888 111 222',
            relationship: 'Mother',
          },
        ],
        medical_info: {
          allergies: null,
          chronic_conditions: null,
          current_medications: null,
          notes: null,
          insurance: null,
        },
        onboarding_completed: true,
      });
      expect(mockRouterReplace).toHaveBeenCalledWith('/home');
    });
  });

  it('clears existing insurance when all insurance fields are blank', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    mockGetDraft.mockResolvedValueOnce({
      data: {
        full_name: 'Alex Nguyen',
        date_of_birth: '1990-01-01',
        gender: 'female',
        height_cm: 170,
        weight_kg: 65,
        phone: '+84 901 234 567',
        address: 'District 1, Ho Chi Minh City',
        blood_type: 'A+',
        emergency_contacts: [
          {
            name: 'Mom',
            email: 'mom@example.com',
            phone: '+84 901 234 568',
            relationship: 'Mother',
          },
        ],
        medical_info: {
          insurance: {
            provider: 'Acme Health',
            policy_number: 'P-99887',
            group_number: 'GRP-001',
          },
        },
      },
      updated_at: '2026-01-01T00:00:00.000Z',
      expires_at: '2026-01-08T00:00:00.000Z',
    });

    const { getByLabelText, getByText } = await renderScreen();

    fireEvent.changeText(getByLabelText('profile.fieldInsuranceProvider'), '');
    fireEvent.changeText(getByLabelText('profile.fieldInsurancePolicyNumber'), '');
    fireEvent.changeText(getByLabelText('profile.fieldInsuranceGroupNumber'), '');
    fireEvent.press(getByText('auth.continueSetup'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          medical_info: expect.objectContaining({
            insurance: null,
          }),
        }),
      );
    });
  });

  it('submits insurance with blank group number as null', async () => {
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();

    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('profile.fieldBloodType'), 'AB-');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldAddress'), 'District 1, Ho Chi Minh City');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 901 234 568');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.changeText(getByLabelText('profile.fieldInsuranceProvider'), 'Health Plus');
    fireEvent.changeText(getByLabelText('profile.fieldInsurancePolicyNumber'), 'PX-123');
    fireEvent.changeText(getByLabelText('profile.fieldInsuranceGroupNumber'), '');

    fireEvent.press(getByText('auth.continueSetup'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
        medical_info: expect.objectContaining({
          insurance: {
            provider: 'Health Plus',
            policy_number: 'PX-123',
            group_number: null,
          },
        }),
      }));
    });
  });

  it('debounces draft save after field edits', async () => {
    jest.useFakeTimers();
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText, getAllByLabelText } = await renderScreen();

    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('profile.fieldBloodType'), 'ab-');
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '68');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldAddress'), 'District 1, Ho Chi Minh City');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Brother');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 901 234 568');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactEmail'), 'brother@example.com');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Brother');
    fireEvent.press(getByText('profile.addEmergencyContact'));
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactName')[1], 'Sister');
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactPhone')[1], '+84 901 234 569');
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactEmail')[1], 'sister@example.com');
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactRelationship')[1], 'Sister');
    fireEvent.changeText(getByLabelText('profile.fieldAllergies'), 'Pollen');
    fireEvent.changeText(getByLabelText('profile.fieldChronicConditions'), 'Hypertension');
    fireEvent.changeText(getByLabelText('profile.fieldCurrentMedications'), 'Aspirin');
    fireEvent.changeText(getByLabelText('profile.fieldMedicalNotes'), 'Follow up monthly');

    expect(mockSaveDraft).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(700);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledWith({
        data: {
          full_name: 'Alex Nguyen',
          date_of_birth: '1990-01-01',
          gender: null,
          height_cm: 170,
          weight_kg: 68,
          phone: '+84 901 234 567',
          address: 'District 1, Ho Chi Minh City',
          blood_type: 'AB-',
          emergency_contacts: [
            {
              name: 'Brother',
              email: 'brother@example.com',
              phone: '+84 901 234 568',
              relationship: 'Brother',
            },
            {
              name: 'Sister',
              email: 'sister@example.com',
              phone: '+84 901 234 569',
              relationship: 'Sister',
            },
          ],
          medical_info: {
            allergies: 'Pollen',
            chronic_conditions: 'Hypertension',
            current_medications: 'Aspirin',
            notes: 'Follow up monthly',
          },
        },
      });
    });

    jest.useRealTimers();
  });

  it('saves insurance fields into the onboarding draft payload', async () => {
    jest.useFakeTimers();
    const updateProfile = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText, getAllByLabelText } = await renderScreen();

    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '68');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldInsuranceProvider'), 'Acme Health');
    fireEvent.changeText(getByLabelText('profile.fieldInsurancePolicyNumber'), 'P-99887');
    fireEvent.changeText(getByLabelText('profile.fieldInsuranceGroupNumber'), 'GRP-001');
    fireEvent.changeText(getByLabelText('profile.fieldAddress'), 'District 1, Ho Chi Minh City');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Brother');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 901 234 568');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactEmail'), 'brother@example.com');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Brother');
    fireEvent.press(getByText('profile.addEmergencyContact'));
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactName')[1], 'Sister');
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactPhone')[1], '+84 901 234 569');
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactEmail')[1], 'sister@example.com');
    fireEvent.changeText(getAllByLabelText('profile.fieldEmergencyContactRelationship')[1], 'Sister');

    expect(mockSaveDraft).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(700);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledWith({
        data: expect.objectContaining({
          medical_info: {
            allergies: null,
            chronic_conditions: null,
            current_medications: null,
            notes: null,
            insurance: {
              provider: 'Acme Health',
              policy_number: 'P-99887',
              group_number: 'GRP-001',
            },
          },
        }),
      });
    });

    jest.useRealTimers();
  });

  it('rejects invalid calendar dates before sending profile setup', async () => {
    const updateProfile = jest.fn();
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 111 111');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '31/02/1990');
    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('auth.setupDateFormatError')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('requires both insurance provider and policy when either is present', async () => {
    const updateProfile = jest.fn();
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 222 333');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.changeText(getByLabelText('profile.fieldInsurancePolicyNumber'), 'P-99887');
    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('profile.validationInsuranceProviderPolicyRequired')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('rejects overlong insurance values before sending profile setup', async () => {
    const updateProfile = jest.fn();
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 222 333');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.changeText(getByLabelText('profile.fieldInsuranceProvider'), 'a'.repeat(129));
    fireEvent.changeText(getByLabelText('profile.fieldInsurancePolicyNumber'), 'P-'.concat('b'.repeat(126)));

    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('profile.validationMaxLength')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('rejects malformed phone number values before saving profile', async () => {
    const updateProfile = jest.fn();
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), 'abc');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 111 111');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('profile.validationPhoneInvalid')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('rejects invalid emergency contact email values before saving profile', async () => {
    const updateProfile = jest.fn();
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 111 111');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactEmail'), 'not-an-email');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('profile.fieldEmergencyContactEmail: profile.validationEmailInvalid')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('rejects overlong emergency contact email before saving profile', async () => {
    const updateProfile = jest.fn();
    setSessionMocks({ updateProfile });

    const { getByLabelText, getByText } = await renderScreen();
    fireEvent.changeText(getByLabelText('profile.fieldFullName'), 'Alex Nguyen');
    fireEvent.changeText(getByLabelText('auth.dateOfBirth'), '01/01/1990');
    fireEvent.press(getByText('auth.sexFemale'));
    fireEvent.changeText(getByLabelText('auth.height'), '170');
    fireEvent.changeText(getByLabelText('auth.weight'), '65');
    fireEvent.changeText(getByLabelText('profile.fieldPhone'), '+84 901 234 567');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactName'), 'Mom');
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactPhone'), '+84 888 111 111');
    fireEvent.changeText(
      getByLabelText('profile.fieldEmergencyContactEmail'),
      `${'a'.repeat(250)}@example.com`,
    );
    fireEvent.changeText(getByLabelText('profile.fieldEmergencyContactRelationship'), 'Mother');
    fireEvent.press(getByText('auth.continueSetup'));

    expect(getByText('profile.fieldEmergencyContactEmail: profile.validationMaxLength')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
