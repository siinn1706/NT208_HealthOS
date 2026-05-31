/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { InsuranceForm } from '../components/forms/insurance-form';
import { profileService } from '../api/services';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: mockBack,
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../api/services', () => ({
  profileService: {
    me: jest.fn(),
    updateMe: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

describe('InsuranceForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileService.me.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'test',
      display_name: 'Test User',
      avatar_url: null,
      onboarding_status: 'completed',
      onboarding_completed_at: '2026-05-01T00:00:00Z',
      full_name: 'Test User',
      medical_info: {
        allergies: 'Peanuts',
        chronic_conditions: null,
        current_medications: null,
        notes: null,
      },
    });
    mockProfileService.updateMe.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'test',
      display_name: 'Test User',
      avatar_url: null,
      onboarding_status: 'completed',
      onboarding_completed_at: '2026-05-01T00:00:00Z',
      full_name: 'Test User',
      medical_info: {
        allergies: 'Peanuts',
        insurance: {
          provider: 'AIA',
          policy_number: 'POL-123',
          group_number: 'GRP-9',
        },
      },
    });
  });

  it('persists insurance details inside Core medical_info', async () => {
    const { getByText, getByLabelText } = render(<InsuranceForm />);

    fireEvent.press(getByText('AIA'));
    fireEvent.changeText(getByLabelText('forms.policyNumber'), 'POL-123');
    fireEvent.changeText(getByLabelText('forms.groupNumber'), 'GRP-9');
    fireEvent.press(getByText('forms.saveInsurance'));

    await waitFor(() => expect(mockProfileService.updateMe).toHaveBeenCalledWith({
      medical_info: {
        allergies: 'Peanuts',
        chronic_conditions: null,
        current_medications: null,
        notes: null,
        insurance: {
          provider: 'AIA',
          policy_number: 'POL-123',
          group_number: 'GRP-9',
        },
      },
    }));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.profile);
    expect(getByText('forms.insuranceSaved')).toBeTruthy();
  });

  it('blocks values longer than the Core insurance contract', () => {
    const { getByText, getByLabelText } = render(<InsuranceForm />);

    fireEvent.press(getByText('AIA'));
    fireEvent.changeText(getByLabelText('forms.policyNumber'), 'POL-123');
    fireEvent.changeText(getByLabelText('forms.groupNumber'), 'x'.repeat(129));
    fireEvent.press(getByText('forms.saveInsurance'));

    expect(getByText('Group number must be 128 characters or fewer.')).toBeTruthy();
    expect(mockProfileService.me).not.toHaveBeenCalled();
    expect(mockProfileService.updateMe).not.toHaveBeenCalled();
  });
});
