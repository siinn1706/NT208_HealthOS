/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AppointmentAssetsCard } from '../components/care/appointment-assets-card';
import { appointmentAssetService } from '../api/services';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { safeOpenUrl } from '../utils/safe-url';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../api/services', () => ({
  appointmentAssetService: {
    list: jest.fn(),
    upload: jest.fn(),
    signedUrl: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../utils/safe-url', () => ({
  safeOpenUrl: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => ({ 'common.retry': 'Retry' }[key] ?? key) }),
}));

const mockDocumentPicker = DocumentPicker.getDocumentAsync as jest.MockedFunction<typeof DocumentPicker.getDocumentAsync>;
const mockUpload = appointmentAssetService.upload as jest.MockedFunction<typeof appointmentAssetService.upload>;
const mockSignedUrl = appointmentAssetService.signedUrl as jest.MockedFunction<typeof appointmentAssetService.signedUrl>;
const mockRemove = appointmentAssetService.remove as jest.MockedFunction<typeof appointmentAssetService.remove>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockSafeOpenUrl = safeOpenUrl as jest.MockedFunction<typeof safeOpenUrl>;

const reloadAssets = jest.fn();
const asset = {
  id: 'asset-1',
  appointment_id: 'apt-1',
  kind: 'attachment' as const,
  mime_type: 'application/pdf',
  size_bytes: 2048,
  sha256: 'abc',
  original_filename: 'note.pdf',
  uploaded_at: '2099-06-02T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  reloadAssets.mockResolvedValue(undefined);
  mockUseApiQuery.mockReturnValue({
    data: [asset],
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: reloadAssets,
  });
});

describe('AppointmentAssetsCard', () => {
  it('uploads a picked appointment file and reloads assets', async () => {
    mockDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///note.pdf', name: 'note.pdf', mimeType: 'application/pdf' }],
    } as never);
    mockUpload.mockResolvedValueOnce(asset);

    const { getByText } = render(<AppointmentAssetsCard appointmentId="apt-1" />);

    fireEvent.press(getByText('care.uploadAppointmentFile'));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith('apt-1', {
        uri: 'file:///note.pdf',
        name: 'note.pdf',
        type: 'application/pdf',
      }, 'attachment');
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.appointmentAssets('apt-1', 'attachment'));
    expect(reloadAssets).toHaveBeenCalled();
  });

  it('rejects invalid document files before calling Core upload', async () => {
    mockDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'https://example.com/note.exe', name: 'note.exe', mimeType: 'application/octet-stream' }],
    } as never);

    const { getByText } = render(<AppointmentAssetsCard appointmentId="apt-1" />);

    fireEvent.press(getByText('care.uploadAppointmentFile'));

    await waitFor(() => expect(getByText('validation.document.bad_uri')).toBeTruthy());
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('opens signed downloads through the appointment asset contract', async () => {
    mockSignedUrl.mockResolvedValueOnce({
      url: 'https://signed.example/note.pdf',
      expires_in_s: 300,
      mime_type: 'application/pdf',
      original_filename: 'note.pdf',
    });
    mockSafeOpenUrl.mockResolvedValueOnce(true);

    const { getByLabelText } = render(<AppointmentAssetsCard appointmentId="apt-1" />);

    fireEvent.press(getByLabelText('care.openAppointmentFile'));
    await waitFor(() => expect(mockSignedUrl).toHaveBeenCalledWith('apt-1', 'asset-1'));
    expect(mockSafeOpenUrl).toHaveBeenCalledWith('https://signed.example/note.pdf');
  });

  it('deletes assets through the appointment asset contract and reloads', async () => {
    mockRemove.mockResolvedValueOnce(undefined as never);

    const { getByLabelText } = render(<AppointmentAssetsCard appointmentId="apt-1" />);

    fireEvent.press(getByLabelText('care.deleteAppointmentFile'));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('apt-1', 'asset-1'));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.appointmentAssets('apt-1', 'attachment'));
    expect(reloadAssets).toHaveBeenCalled();
  });
});
