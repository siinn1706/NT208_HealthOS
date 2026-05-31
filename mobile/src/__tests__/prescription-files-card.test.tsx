/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import { PrescriptionFilesCard } from '../components/care/prescription-files-card';
import { prescriptionAssetService } from '../api/services';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { safeOpenUrl } from '../utils/safe-url';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../api/services', () => ({
  prescriptionAssetService: {
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
const mockUpload = prescriptionAssetService.upload as jest.MockedFunction<typeof prescriptionAssetService.upload>;
const mockSignedUrl = prescriptionAssetService.signedUrl as jest.MockedFunction<typeof prescriptionAssetService.signedUrl>;
const mockRemove = prescriptionAssetService.remove as jest.MockedFunction<typeof prescriptionAssetService.remove>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockSafeOpenUrl = safeOpenUrl as jest.MockedFunction<typeof safeOpenUrl>;

const reloadAssets = jest.fn();

const asset = {
  id: 'asset-1',
  appointment_id: 'apt-1',
  mime_type: 'application/pdf',
  size_bytes: 2048,
  sha256: 'abc',
  original_filename: 'rx.pdf',
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

describe('PrescriptionFilesCard', () => {
  it('uploads a picked prescription file and reloads assets', async () => {
    mockDocumentPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///rx.pdf', name: 'rx.pdf', mimeType: 'application/pdf' }],
    } as never);
    mockUpload.mockResolvedValueOnce(asset);

    const { getByText } = render(<PrescriptionFilesCard appointmentId="apt-1" />);

    fireEvent.press(getByText('Upload prescription file'));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith('apt-1', {
        uri: 'file:///rx.pdf',
        name: 'rx.pdf',
        type: 'application/pdf',
      });
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.prescriptionAssets('apt-1'));
    expect(reloadAssets).toHaveBeenCalled();
  });

  it('opens signed downloads through the Core asset contract', async () => {
    mockSignedUrl.mockResolvedValueOnce({
      url: 'https://signed.example/rx.pdf',
      expires_in_s: 300,
      mime_type: 'application/pdf',
      original_filename: 'rx.pdf',
    });
    mockSafeOpenUrl.mockResolvedValueOnce(true);

    const { getByLabelText } = render(<PrescriptionFilesCard appointmentId="apt-1" />);

    fireEvent.press(getByLabelText('Open prescription file'));
    await waitFor(() => expect(mockSignedUrl).toHaveBeenCalledWith('apt-1', 'asset-1'));
    expect(mockSafeOpenUrl).toHaveBeenCalledWith('https://signed.example/rx.pdf');
  });

  it('deletes assets through the Core asset contract and reloads assets', async () => {
    mockRemove.mockResolvedValueOnce(undefined as never);

    const { getByLabelText } = render(<PrescriptionFilesCard appointmentId="apt-1" />);

    fireEvent.press(getByLabelText('Delete prescription file'));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('apt-1', 'asset-1'));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.prescriptionAssets('apt-1'));
    expect(reloadAssets).toHaveBeenCalled();
  });
});
