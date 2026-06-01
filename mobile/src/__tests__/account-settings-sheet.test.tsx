/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SettingsSheet } from '../components/profile/account-settings-sheet';
import { authService, profileService } from '../api/services';
import { accountExportService } from '../api/services/account-export-service';
import { safeOpenUrl } from '../utils/safe-url';

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../api/services/account-export-service', () => ({
  accountExportService: {
    requestExport: jest.fn(),
    exportStatus: jest.fn(),
    exportDownload: jest.fn(),
  },
}));

jest.mock('../api/services', () => ({
  authService: {
    requestOtp: jest.fn(),
  },
  profileService: {
    requestAccountDeletion: jest.fn(),
  },
}));

const mockClearSession = jest.fn();

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    user: { email: 'person@example.com' },
    clearSession: mockClearSession,
  }),
}));

jest.mock('../utils/safe-url', () => ({
  safeOpenUrl: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockAccountExport = accountExportService as jest.Mocked<typeof accountExportService>;
const mockSafeOpenUrl = safeOpenUrl as jest.MockedFunction<typeof safeOpenUrl>;

jest.setTimeout(15000);

beforeEach(() => {
  jest.clearAllMocks();
  mockClearSession.mockResolvedValue(undefined);
  mockAuthService.requestOtp.mockResolvedValue({
    data: { delivery: 'email', expires_in_seconds: 300, otp: undefined },
  });
  mockProfileService.requestAccountDeletion.mockResolvedValue({
    status: 'pending_deletion',
    purge_at: '2026-06-30T00:00:00.000Z',
  });
  mockAccountExport.requestExport.mockResolvedValue({
    id: 'export-1',
    status: 'pending',
    requested_at: '2026-05-31T10:00:00.000Z',
    completed_at: null,
    expires_at: null,
    bytes: null,
    error: null,
  });
  mockAccountExport.exportStatus.mockResolvedValue({
    id: 'export-1',
    status: 'completed',
    requested_at: '2026-05-31T10:00:00.000Z',
    completed_at: '2026-05-31T10:01:00.000Z',
    expires_at: '2026-06-07T10:01:00.000Z',
    bytes: 4096,
    error: null,
  });
  mockAccountExport.exportDownload.mockResolvedValue({
    url: 'https://example.test/account-export.zip',
    expires_in_s: 300,
    bytes: 4096,
    expires_at: '2026-05-31T10:06:00.000Z',
  });
  mockSafeOpenUrl.mockResolvedValue(true);
});

describe('SettingsSheet', () => {
  it('requests, refreshes, and opens an account export', async () => {
    const { getByText } = render(<SettingsSheet visible={true} onClose={() => {}} />);

    fireEvent.press(getByText('Request archive'));
    await waitFor(() => expect(mockAccountExport.requestExport).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getByText('Status: pending')).toBeTruthy());

    fireEvent.press(getByText('Refresh'));
    await waitFor(() => expect(mockAccountExport.exportStatus).toHaveBeenCalledWith('export-1'));
    await waitFor(() => expect(getByText('Status: completed')).toBeTruthy());

    fireEvent.press(getByText('Open download'));
    await waitFor(() => {
      expect(mockAccountExport.exportDownload).toHaveBeenCalledWith('export-1');
      expect(mockSafeOpenUrl).toHaveBeenCalledWith('https://example.test/account-export.zip');
    });
  });

  it('requests a delete-account OTP for the signed-in email', async () => {
    const { getByText } = render(<SettingsSheet visible={true} onClose={() => {}} />);

    fireEvent.press(getByText('Send deletion code'));

    await waitFor(() => {
      expect(mockAuthService.requestOtp).toHaveBeenCalledWith({
        email: 'person@example.com',
        purpose: 'delete_account',
      });
    });
    await waitFor(() => expect(getByText('Deletion code sent. Expires in 300 seconds.')).toBeTruthy());
  });

  it('schedules account deletion and clears the local session', async () => {
    const onClose = jest.fn();
    const { getByLabelText, getByText } = render(<SettingsSheet visible={true} onClose={onClose} />);

    fireEvent.changeText(getByLabelText('Confirm email'), 'person@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'secret-password');
    fireEvent.changeText(getByLabelText('Reason'), 'Moving provider');
    fireEvent.press(getByText('Schedule deletion'));

    await waitFor(() => {
      expect(mockProfileService.requestAccountDeletion).toHaveBeenCalledWith({
        confirmation_email: 'person@example.com',
        password: 'secret-password',
        otp_code: undefined,
        reason: 'Moving provider',
      });
      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('blocks deletion when confirmation email does not match the session email', async () => {
    const { getByLabelText, getByText } = render(<SettingsSheet visible={true} onClose={() => {}} />);

    fireEvent.changeText(getByLabelText('Confirm email'), 'other@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'secret-password');
    fireEvent.press(getByText('Schedule deletion'));

    await waitFor(() => expect(getByText('Email does not match this account.')).toBeTruthy());
    expect(mockProfileService.requestAccountDeletion).not.toHaveBeenCalled();
  });
});
