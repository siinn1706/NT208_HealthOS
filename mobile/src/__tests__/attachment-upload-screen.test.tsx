/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { AttachmentUploadScreen } from '../components/care/attachment-upload-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('AttachmentUploadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.appointments) {
        return {
          ...baseQueryState,
          data: [{
            id: 'apt-1',
            appointment_date: '2099-06-02T09:00:00.000Z',
            doctor_name: 'Dr Care',
            specialty: 'Primary care',
            clinic: 'Clinic A',
            diagnosis: null,
            visit_type: 'in_person',
            video_join_url: null,
            status: 'upcoming',
            notes: null,
            has_prescription: false,
            prescription: null,
          }],
        } as never;
      }
      if (key === queryKeys.appointmentAssets('apt-1', 'attachment')) {
        return {
          ...baseQueryState,
          data: [{
            id: 'asset-1',
            appointment_id: 'apt-1',
            kind: 'attachment',
            mime_type: 'application/pdf',
            size_bytes: 2048,
            sha256: 'abc',
            original_filename: 'visit-note.pdf',
            uploaded_at: '2099-06-02T10:00:00.000Z',
          }],
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
  });

  it('renders real appointment asset upload/list UI without fake local rows', () => {
    const { getByText, queryByText } = render(<AttachmentUploadScreen />);

    expect(getByText('care.chooseAppointmentForFiles')).toBeTruthy();
    expect(getByText('Dr Care')).toBeTruthy();
    expect(getByText('visit-note.pdf')).toBeTruthy();
    expect(getByText('care.uploadAppointmentFile')).toBeTruthy();
    expect(queryByText('care.attachmentUploadUnavailable')).toBeNull();
    expect(queryByText('lab_results.pdf')).toBeNull();
    expect(queryByText('xray_scan.png')).toBeNull();
    expect(queryByText('Uploaded')).toBeNull();
  });
});
