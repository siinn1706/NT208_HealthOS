/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { EmergencySheet } from '../components/profile/me-screen-modals';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { emergencyService } from '../api/services/emergency-service';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({ name: 'calm', setTheme: jest.fn() }),
}));

jest.mock('../api/services/emergency-service', () => ({
  emergencyService: {
    profile: jest.fn(),
    updateProfile: jest.fn(),
    createToken: jest.fn(),
    listTokens: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllTokens: jest.fn(),
    accessLogs: jest.fn(),
  },
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockEmergencyService = emergencyService as jest.Mocked<typeof emergencyService>;
let tokenReload: jest.Mock;

function queryState(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: Array.isArray(data) ? data.length === 0 : false,
    reload: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  tokenReload = jest.fn();
  mockEmergencyService.createToken.mockResolvedValue({
    token_meta: {
      id: 'tok-new',
      label: 'Mobile token',
      created_at: '2026-05-20T10:00:00.000Z',
      revoked_at: null,
      expires_at: null,
      last_accessed_at: null,
      access_count: 0,
      is_active: true,
    },
    token: 'secret-token',
    share_url: 'https://healthos/emergency/secret-token',
    qr_png_data_url: 'data:image/png;base64,abc',
    wallet_pdf_data_url: null,
  });
  mockEmergencyService.updateProfile.mockResolvedValue({} as never);
  mockEmergencyService.revokeToken.mockResolvedValue([] as never);
  mockEmergencyService.revokeAllTokens.mockResolvedValue([] as never);
  const profileState = queryState({
    is_published: true,
    assistance_needed: ['walking'],
    equipment_notes: 'Wheelchair available',
    communication_notes: 'Speak slowly',
    field_visibility: { medications: true, contacts: true },
    nkda_confirmed: true,
    preferred_language: 'en',
    last_published_at: null,
    card: {
      full_name: 'Test User',
      age_years: 30,
      gender: 'male',
      preferred_language: 'en',
      blood_type: 'A+',
      nkda_confirmed: true,
      allergies: [],
      chronic_conditions: [],
      medications: [],
      assistance_needed: [],
      equipment_notes: null,
      communication_notes: null,
      emergency_contacts: [],
      last_updated_at: null,
    },
    completeness_score: 80,
    missing_critical_fields: [],
    nudges: [],
    tokens: [],
    active_token_count: 1,
    max_active_tokens: 5,
  });
  const tokenState = queryState([
    {
      id: 'tok-1',
      label: 'First responder card',
      created_at: '2026-05-20T10:00:00.000Z',
      revoked_at: null,
      expires_at: null,
      last_accessed_at: null,
      access_count: 2,
      is_active: true,
    },
  ]);
  const logState = queryState([
    {
      id: 'log-1',
      token_id: 'tok-1',
      ip_truncated: '10.0.0.0/24',
      user_agent: 'unit-test',
      accessed_at: '2026-05-20T12:00:00.000Z',
    },
  ]);
  mockUseApiQuery.mockImplementation((key: string) => {
    if (key === queryKeys.emergencyProfile) return profileState as never;
    if (key === queryKeys.emergencyTokens) return { ...tokenState, reload: tokenReload } as never;
    if (key === queryKeys.emergencyAccessLogs) return logState as never;
    return queryState(null) as never;
  });
});

describe('EmergencySheet', () => {
  it('renders live emergency profile and token data', async () => {
    const { getByText } = render(<EmergencySheet visible={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(getByText('First responder card')).toBeTruthy();
      expect(getByText('Share tokens')).toBeTruthy();
    });
  });

  it('triggers token creation action', async () => {
    const { getByText } = render(<EmergencySheet visible={true} onClose={() => {}} />);
    fireEvent.press(getByText('Create token'));

    await waitFor(() => {
      expect(mockEmergencyService.createToken).toHaveBeenCalled();
      expect(tokenReload).toHaveBeenCalled();
    });
  });
});
