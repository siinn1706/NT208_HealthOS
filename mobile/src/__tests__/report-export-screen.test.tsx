/* eslint-env jest */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReportExportScreen } from '../components/insights/reports/report-export-screen';
import { reportService } from '../api/services';

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
let mockLanguage = 'en';

jest.mock('expo-router', () => ({
  router: {
    back: mockBack,
  },
  useLocalSearchParams: jest.fn(() => mockParams),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: mockLanguage } }),
}));

jest.mock('../api/services', () => ({
  reportService: {
    get: jest.fn(),
    requestPdf: jest.fn(),
    pdfStatus: jest.fn(),
    pdfDownload: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockGetReport = reportService.get as jest.MockedFunction<typeof reportService.get>;
const mockRequestPdf = reportService.requestPdf as jest.MockedFunction<typeof reportService.requestPdf>;
const mockPdfStatus = reportService.pdfStatus as jest.MockedFunction<typeof reportService.pdfStatus>;
const mockPdfDownload = reportService.pdfDownload as jest.MockedFunction<typeof reportService.pdfDownload>;

const reportFixture = {
  id: 'report-7d',
  user_id: 'user-1',
  period: '7d',
  generated_at: '2026-05-30T12:00:00.000Z',
  status: 'normal',
  alerts: [],
  sections: [
    {
      category: 'vitals',
      title: 'Vitals trend',
      summary: 'Heart rate and glucose stabilized this week.',
      status: 'normal',
      data: [],
      stats: { average: 72, min: 60, max: 90, trend: 'stable', change_percent: 0, unit: 'bpm' },
      alerts: [],
    },
    {
      category: 'medication',
      title: 'Medication adherence',
      summary: 'Dose history is ready for review.',
      status: 'normal',
      data: [],
      stats: { average: 96, min: 90, max: 100, trend: 'stable', change_percent: 2, unit: '%' },
      alerts: [],
    },
    {
      category: 'nutrition',
      title: 'Nutrition balance',
      summary: 'Meal totals and nutrition notes are available.',
      status: 'normal',
      data: [],
      stats: { average: 1800, min: 1400, max: 2100, trend: 'stable', change_percent: 1, unit: 'kcal' },
      alerts: [],
    },
  ],
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockParams = {};
  mockLanguage = 'en';
  mockGetReport.mockResolvedValue(reportFixture);
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
  it('builds the export request from live report sections', async () => {
    const { getAllByRole, getByText, queryByText } = render(<ReportExportScreen />);

    await waitFor(() => expect(getByText('Vitals trend')).toBeTruthy());
    expect(getByText('Medication adherence')).toBeTruthy();
    expect(getByText('Nutrition balance')).toBeTruthy();
    expect(queryByText('Sleep')).toBeNull();

    const switches = getAllByRole('switch');
    fireEvent.press(switches[1]); // Medication adherence
    fireEvent.press(getByText('insights.sharePdf'));

    await waitFor(() => expect(mockRequestPdf).toHaveBeenCalledTimes(1));
    expect(mockRequestPdf).toHaveBeenCalledWith({
      period: '7d',
      sections: ['vitals', 'nutrition'],
      locale: 'en',
      include_sensitive: false,
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
  });

  it('requires explicit sensitive consent when medication is selected', async () => {
    const { getAllByRole, getByText } = render(<ReportExportScreen />);

    await waitFor(() => expect(getByText('Medication adherence')).toBeTruthy());
    fireEvent.press(getByText('insights.sharePdf'));

    expect(getByText('insights.sensitiveSectionsBlocked')).toBeTruthy();
    expect(mockRequestPdf).not.toHaveBeenCalled();

    const switches = getAllByRole('switch');
    fireEvent.press(switches[3]); // Include sensitive sections
    fireEvent.press(getByText('insights.sharePdf'));

    await waitFor(() => expect(mockRequestPdf).toHaveBeenCalledTimes(1));
    expect(mockRequestPdf).toHaveBeenCalledWith({
      period: '7d',
      sections: ['vitals', 'medication', 'nutrition'],
      locale: 'en',
      include_sensitive: true,
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
  });

  it('uses selected route period and app locale for the export request', async () => {
    mockParams = { period: '30d' };
    mockLanguage = 'vi-VN';
    const { getAllByRole, getByText, queryByText } = render(<ReportExportScreen />);

    await waitFor(() => expect(getByText('Vitals trend')).toBeTruthy());

    expect(queryByText('Apr 18 – Apr 24')).toBeNull();
    fireEvent.press(getAllByRole('switch')[1]); // Medication adherence
    fireEvent.press(getByText('insights.sharePdf'));

    await waitFor(() => expect(mockRequestPdf).toHaveBeenCalledWith(expect.objectContaining({
      period: '30d',
      locale: 'vi',
      include_sensitive: false,
    })));

    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
  });

  it('renders only the supported PDF destination', async () => {
    const { getAllByRole, getByText, queryByText } = render(<ReportExportScreen />);

    await waitFor(() => expect(getByText('Vitals trend')).toBeTruthy());

    expect(getByText('insights.pdfOnlyDestination')).toBeTruthy();
    expect(queryByText('Doctor')).toBeNull();
    expect(queryByText('Link')).toBeNull();
    expect(queryByText('Family')).toBeNull();
    fireEvent.press(getAllByRole('switch')[1]); // Medication adherence
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
