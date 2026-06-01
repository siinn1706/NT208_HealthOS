/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { IntakeForm } from '../components/forms/intake-form';
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

describe('IntakeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileService.updateMe.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'test',
      display_name: 'Test User',
      avatar_url: null,
      onboarding_status: 'completed',
      onboarding_completed_at: '2026-05-01T00:00:00Z',
      full_name: 'Taylor Nguyen',
    });
  });

  it('submits only Core-supported profile fields', async () => {
    const { getByLabelText, getByText, queryByLabelText } = render(<IntakeForm />);

    expect(queryByLabelText('auth.email')).toBeNull();

    fireEvent.changeText(getByLabelText('forms.fullName'), 'Taylor Nguyen');
    fireEvent.changeText(getByLabelText('forms.dateOfBirth'), '1995-04-03');
    fireEvent.changeText(getByLabelText('forms.phoneNumber'), '+84 900 000 000');
    fireEvent.changeText(getByLabelText('forms.address'), 'District 1');
    fireEvent.press(getByText('forms.submitIntake'));

    await waitFor(() => expect(mockProfileService.updateMe).toHaveBeenCalledWith({
      full_name: 'Taylor Nguyen',
      date_of_birth: '1995-04-03',
      phone: '+84 900 000 000',
      address: 'District 1',
    }));
    expect(mockProfileService.updateMe.mock.calls[0]?.[0]).not.toHaveProperty('email');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.profile);
    expect(getByText('forms.intakeSubmitted')).toBeTruthy();
  });
});
