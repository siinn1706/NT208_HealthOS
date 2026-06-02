/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { InsuranceForm } from '../components/forms/insurance-form';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import type { CurrentUser, MedicalInfo } from '../types/api';

const mockBack = jest.fn();
const mockUpdateProfile = jest.fn();

const mockMedicalInfo: MedicalInfo = {
  allergies: 'Peanuts',
  chronic_conditions: null,
  current_medications: null,
  notes: null,
};

const mockSessionUser: CurrentUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'test',
  display_name: 'Test User',
  avatar_url: null,
  onboarding_status: 'completed',
  onboarding_completed_at: '2026-05-01T00:00:00Z',
  full_name: 'Test User',
  medical_info: mockMedicalInfo,
};

const mockTranslation: Record<string, string> = {
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.done': 'Done',
  'common.working': 'Saving...',
  'forms.provider': 'PROVIDER',
  'forms.policyNumber': 'Policy number',
  'forms.policyNumberPlaceholder': 'e.g. HC-1234567890',
  'forms.groupNumber': 'Group number (optional)',
  'forms.groupNumberPlaceholder': 'e.g. GRP-001',
  'forms.uploadCard': 'UPLOAD CARD',
  'forms.cardUploadUnavailableTitle': 'Card image upload unavailable',
  'forms.cardUploadUnavailableMessage': 'Card images are not stored yet.',
  'forms.saveInsurance': 'Save insurance',
  'forms.insuranceSaved': 'Insurance saved',
  'forms.insuranceSavedMessage': 'Your insurance information has been recorded.',
  'forms.validationError': 'Validation error',
  'profile.fieldInsuranceProvider': 'Insurance provider',
  'profile.fieldInsurancePolicyNumber': 'Policy number',
  'profile.fieldInsuranceGroupNumber': 'Group number',
  'profile.validationMaxLength': '{{field}} must be {{max}} characters or fewer.',
  'profile.validationInsuranceProviderPolicyRequired': 'Insurance provider and policy number are required.',
  'profile.saveError': 'Unable to save profile.',
};

function mockTranslate(key: string, params?: Record<string, unknown>) {
  const value = mockTranslation[key] ?? key;
  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, token) => (params[token] ?? `{{${token}}}`).toString());
}

jest.mock('expo-router', () => ({
  router: {
    back: mockBack,
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => mockTranslate(key, params) }),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    user: mockSessionUser,
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

const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

describe('InsuranceForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionUser.medical_info = {
      ...mockMedicalInfo,
    };
    mockUpdateProfile.mockResolvedValue({
      ...mockSessionUser,
      medical_info: {
        ...mockSessionUser.medical_info,
      },
    });
  });

  it('prefills insurance fields from current user profile', () => {
    mockSessionUser.medical_info = {
      ...mockMedicalInfo,
      insurance: {
        provider: 'Acme Health',
        policy_number: 'POL-88',
        group_number: 'GROUP-1',
      },
    };

    const { getByLabelText } = render(<InsuranceForm />);

    expect(getByLabelText('Insurance provider').props.value).toBe('Acme Health');
    expect(getByLabelText('Policy number').props.value).toBe('POL-88');
    expect(getByLabelText('Group number (optional)').props.value).toBe('GROUP-1');
  });

  it('persists insurance details via session profile update while keeping existing medical keys', async () => {
    const { getByLabelText, getByText } = render(<InsuranceForm />);

    fireEvent.press(getByText('AIA'));
    fireEvent.changeText(getByLabelText('Policy number'), 'POL-123');
    fireEvent.changeText(getByLabelText('Group number (optional)'), '');
    fireEvent.press(getByText('Save insurance'));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        medical_info: {
          allergies: 'Peanuts',
          chronic_conditions: null,
          current_medications: null,
          notes: null,
          insurance: {
            provider: 'AIA',
            policy_number: 'POL-123',
            group_number: null,
          },
        },
      }),
    );
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.profile);
    expect(getByText('Insurance saved')).toBeTruthy();
  });

  it('supports arbitrary prefilled providers outside the chip presets', async () => {
    mockSessionUser.medical_info = {
      ...mockMedicalInfo,
      insurance: {
        provider: 'Blue Cross Blue Shield',
        policy_number: 'POL-77',
        group_number: 'GR-7',
      },
    };

    const { getByLabelText, getByText } = render(<InsuranceForm />);

    expect(getByLabelText('Insurance provider').props.value).toBe('Blue Cross Blue Shield');
    fireEvent.changeText(getByLabelText('Insurance provider'), 'Blue Cross Blue Shield Plus');
    fireEvent.press(getByText('Save insurance'));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          medical_info: expect.objectContaining({
            insurance: expect.objectContaining({
              provider: 'Blue Cross Blue Shield Plus',
              policy_number: 'POL-77',
              group_number: 'GR-7',
            }),
          }),
        }),
      ),
    );
  });

  it('blocks values longer than contract limits before saving', () => {
    const { getByLabelText, getByText } = render(<InsuranceForm />);

    fireEvent.changeText(getByLabelText('Insurance provider'), 'x'.repeat(129));
    fireEvent.changeText(getByLabelText('Policy number'), 'POL-123');
    fireEvent.press(getByText('Save insurance'));

    expect(getByText('Insurance provider must be 128 characters or fewer.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockSessionUser.medical_info).toEqual({
      allergies: 'Peanuts',
      chronic_conditions: null,
      current_medications: null,
      notes: null,
    });
  });
});
