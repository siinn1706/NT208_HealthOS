/* eslint-env jest */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import {
  MEAL_SCAN_MAX_POLL_ATTEMPTS,
  MealScanAnalyzingScreen,
  getMealScanCancelRoute,
  getMealScanPollingError,
} from '../components/meals/meal-scan-analyzing-screen';
import { mealService } from '../api/services';
import type { MealScanQueuedPhoto } from '../api/services/meal-offline-queue';

const mockBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: { mealId?: string; jobId?: string; imageUri?: string; queuedMealPhotoId?: string } = {};
const mockNetInfoFetch = jest.fn();
const mockNetInfoListeners: ((state: { isConnected?: boolean | null; isInternetReachable?: boolean | null; }) => void)[] = [];
const mockGetQueuedMealPhoto = jest.fn();
const mockIncrementQueuedMealScanPhotoAttempts = jest.fn();
const mockRemoveQueuedMealScanPhoto = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  fetch: (...args: unknown[]) => mockNetInfoFetch(...args),
  addEventListener: (handler: (state: unknown) => void) => {
    mockNetInfoListeners.push(handler as never);
    return () => {
      const index = mockNetInfoListeners.indexOf(handler as never);
      if (index >= 0) mockNetInfoListeners.splice(index, 1);
    };
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../api/services', () => ({
  mealService: {
    analysisStatus: jest.fn(),
    analysisStatusByJob: jest.fn(),
    analyzePhoto: jest.fn(),
  },
}));

jest.mock('../api/services/meal-offline-queue', () => ({
  isTransientMealScanUploadError: (error: unknown) => (
    error instanceof Error && /network|fetch|offline/i.test(error.message)
  ),
  getQueuedMealScanPhoto: (...args: unknown[]) => mockGetQueuedMealPhoto(...args),
  incrementQueuedMealScanPhotoAttempts: (...args: unknown[]) => mockIncrementQueuedMealScanPhotoAttempts(...args),
  removeQueuedMealScanPhoto: (...args: unknown[]) => mockRemoveQueuedMealScanPhoto(...args),
}));

const mockMealService = mealService as jest.Mocked<typeof mealService>;

describe('MealScanAnalyzingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockMealService.analysisStatus.mockReset();
    mockMealService.analysisStatusByJob.mockReset();
    mockMealService.analyzePhoto.mockReset();
    mockNetInfoFetch.mockReset();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockNetInfoListeners.splice(0);
    mockGetQueuedMealPhoto.mockReset();
    mockIncrementQueuedMealScanPhotoAttempts.mockReset();
    mockIncrementQueuedMealScanPhotoAttempts.mockResolvedValue(undefined);
    mockRemoveQueuedMealScanPhoto.mockReset();
    mockRemoveQueuedMealScanPhoto.mockResolvedValue(undefined);
    mockCanGoBack.mockReturnValue(true);
    mockParams = { mealId: 'meal-1', jobId: 'job-1', imageUri: 'file:///meal.jpg' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the job status endpoint when a job id is available and surfaces backend failure copy', async () => {
    mockMealService.analysisStatusByJob.mockResolvedValue({
      job_id: 'job-1',
      meal_id: 'meal-1',
      status: 'failed',
      error: { code: 'AI_WORKER_FAILED', message: 'AI worker returned error' },
    });

    const { getByText } = render(<MealScanAnalyzingScreen />);

    await waitFor(() => {
      expect(mockMealService.analysisStatusByJob).toHaveBeenCalledWith('job-1');
      expect(mockMealService.analysisStatus).not.toHaveBeenCalled();
      expect(getByText('AI worker returned error')).toBeTruthy();
    });
  });

  it('loads queued scan data and waits for connectivity before submitting', async () => {
    const queuedPhoto: MealScanQueuedPhoto = {
      id: 'queued-1',
      uri: 'file:///queued-meal.jpg',
      fileName: 'queued-meal.jpg',
      mimeType: 'image/jpeg',
      name: 'meals.scannedMealName',
      queuedAt: Date.now(),
      attemptCount: 0,
    };
    mockParams = { queuedMealPhotoId: 'queued-1', imageUri: 'file:///queued-meal.jpg' };
    mockGetQueuedMealPhoto.mockResolvedValue(queuedPhoto);
    mockNetInfoFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const { getByText } = render(<MealScanAnalyzingScreen />);

    await waitFor(() => {
      expect(mockGetQueuedMealPhoto).toHaveBeenCalledWith('queued-1');
      expect(mockMealService.analysisStatus).not.toHaveBeenCalled();
      expect(mockMealService.analysisStatusByJob).not.toHaveBeenCalled();
      expect(mockMealService.analyzePhoto).not.toHaveBeenCalled();
    });
    expect(getByText('meals.photoAnalysisQueued')).toBeTruthy();
  });

  it('retries queued analysis automatically when connectivity returns', async () => {
    const queuedPhoto: MealScanQueuedPhoto = {
      id: 'queued-1',
      uri: 'file:///queued-meal.jpg',
      fileName: 'queued-meal.jpg',
      mimeType: 'image/jpeg',
      name: 'meals.scannedMealName',
      queuedAt: Date.now(),
      attemptCount: 1,
    };
    mockParams = { queuedMealPhotoId: 'queued-1', imageUri: 'file:///queued-meal.jpg' };
    mockGetQueuedMealPhoto.mockResolvedValue(queuedPhoto);
    mockNetInfoFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    mockMealService.analyzePhoto.mockResolvedValue({ meal_id: 'meal-queued', job_id: 'job-queued', status: 'processing' });

    render(<MealScanAnalyzingScreen />);

    await waitFor(() => {
      expect(mockMealService.analyzePhoto).not.toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockNetInfoListeners).toHaveLength(1);
    });

    await act(async () => {
      mockNetInfoListeners[0]?.({ isConnected: true, isInternetReachable: true });
    });

    await waitFor(() => {
      expect(mockMealService.analyzePhoto).toHaveBeenCalledWith({
        name: 'meals.scannedMealName',
        image: {
          uri: 'file:///queued-meal.jpg',
          name: 'queued-meal.jpg',
          type: 'image/jpeg',
        },
      });
      expect(mockRemoveQueuedMealScanPhoto).toHaveBeenCalledWith('queued-1');
      expect(mockReplace).toHaveBeenCalledWith('/meals/scan-results?mealId=meal-queued&jobId=job-queued&imageUri=file%3A%2F%2F%2Fqueued-meal.jpg');
    });
  });

  it('routes to scan results using the meal id returned by the job status contract', async () => {
    mockMealService.analysisStatusByJob.mockResolvedValue({
      job_id: 'job-1',
      meal_id: 'meal-from-job',
      status: 'analyzed',
      nutrition_result: null,
    });

    render(<MealScanAnalyzingScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/meals/scan-results?mealId=meal-from-job&imageUri=file%3A%2F%2F%2Fmeal.jpg');
    });
  });

  it('renders the captured photo while analysis is in progress', async () => {
    mockMealService.analysisStatusByJob.mockResolvedValue({
      job_id: 'job-1',
      meal_id: 'meal-1',
      status: 'failed',
      error: { code: 'AI_WORKER_FAILED', message: 'AI worker returned error' },
    });

    const { getByTestId, getByText } = render(<MealScanAnalyzingScreen />);

    await waitFor(() => {
      expect(getByTestId('meal-scan-analyzing-photo').props.source).toEqual({ uri: 'file:///meal.jpg' });
      expect(getByText('AI worker returned error')).toBeTruthy();
    });
  });

  it('derives bounded polling recovery copy when analysis stays processing too long', () => {
    expect(getMealScanPollingError({
      job_id: 'job-1',
      meal_id: 'meal-1',
      status: 'processing',
    }, MEAL_SCAN_MAX_POLL_ATTEMPTS - 1)).toBe(
      'Meal photo analysis is taking longer than expected. Please check your meal log or retake the photo.',
    );
  });

  it('falls back to the scan camera route when cancel has no navigation history', () => {
    expect(getMealScanCancelRoute(false)).toBe('/meals/scan');
    expect(getMealScanCancelRoute(true)).toBeNull();
  });
});
