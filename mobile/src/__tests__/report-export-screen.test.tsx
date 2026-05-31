/* eslint-env jest */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReportExportScreen } from '../components/insights/reports/report-export-screen';
import { reportService } from '../api/services';

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
  reportService: {
    requestPdf: jest.fn(),
    pdfStatus: jest.fn(),
    pdfDownload: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockRequestPdf = reportService.requestPdf as jest.MockedFunction<typeof reportService.requestPdf>;
const mockPdfStatus = reportService.pdfStatus as jest.MockedFunction<typeof reportService.pdfStatus>;
const mockPdfDownload = reportService.pdfDownload as jest.MockedFunction<typeof reportService.pdfDownload>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRequestPdf.mockResolvedValue({
    id: 'request-1',
    status: 'queued',
    period: '7d',
    sections: ['vitals'],
    locale: 'en',
    include_sensitive: false,
    requested_at: '2026-05-30T12:00:00.000Z',
    completed_at: null,
    expires_at: null,
    bytes: null,
    error: null,
  });
  mockPdfStatus.mockResolvedValue({
    id: 'request-1',
    status: 'completed',
    period: '7d',
    sections: ['vitals'],
    locale: 'en',
    include_sensitive: false,
    requested_at: '2026-05-30T12:00:00.000Z',
    completed_at: '2026-05-30T12:00:01.000Z',
    expires_at: null,
    bytes: 1234,
    error: null,
  });
  mockPdfDownload.mockResolvedValue({
    url: 'https://example.test/report.pdf',
    expires_in_s: 300,
    bytes: 1234,
    expires_at: '2026-05-30T12:05:00.000Z',
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ReportExportScreen', () => {
  it('builds the export request from selected section toggles', async () => {
    const { getAllByRole, getByText } = render(<ReportExportScreen />);

    const switches = getAllByRole('switch');
    fireEvent.press(switches[2]); // Meals & nutrition
    fireEvent.press(getByText('insights.sharePdf'));

    await waitFor(() => expect(mockRequestPdf).toHaveBeenCalledTimes(1));
    expect(mockRequestPdf).toHaveBeenCalledWith({
      period: '7d',
      sections: ['vitals', 'medication', 'activity', 'sleep', 'bmi'],
      locale: 'en',
      include_sensitive: false,
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
  });

  it('does not let unsupported destinations replace the PDF request path', async () => {
    const { getByRole, getByText } = render(<ReportExportScreen />);

    const doctorButton = getByRole('button', { name: 'Doctor' });
    expect(doctorButton.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(getByText('Doctor'));
    fireEvent.press(getByText('insights.sharePdf'));

    await waitFor(() => {
      expect(mockRequestPdf).toHaveBeenCalledWith(expect.objectContaining({
        include_sensitive: false,
      }));
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
  });
});
