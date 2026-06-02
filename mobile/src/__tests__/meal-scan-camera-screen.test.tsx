/* eslint-env jest */
import React from 'react';
import { Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MealScanCameraScreen } from '../components/meals/meal-scan-camera-screen';
import { mealService } from '../api/services';
import { invalidateApiQuery } from '../api/query';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockLatestCameraProps: Record<string, any> | null = null;
const mockTakePictureAsync = jest.fn();
const mockQueueMealScanPhoto = jest.fn();
const mockRequestCameraPermission = jest.fn();
let mockCameraPermissionGranted = true;
let mockCameraReadyCalls = 0;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params?.type && params?.code) return `${key}:${params.type}:${params.code}`;
      return key;
    },
  }),
}));

jest.mock('expo-camera', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: MockView } = require('react-native');
  const MockCameraView = ReactMock.forwardRef((props: Record<string, any>, ref: React.Ref<unknown>) => {
    mockLatestCameraProps = props;
    ReactMock.useImperativeHandle(ref, () => ({
      takePictureAsync: mockTakePictureAsync,
    }));
    ReactMock.useEffect(() => {
      mockCameraReadyCalls += 1;
      props.onCameraReady?.();
      return () => {
        mockLatestCameraProps = null;
      };
    }, []);
    return <MockView testID="camera-view">{props.children}</MockView>;
  });
  return {
    CameraView: MockCameraView,
    useCameraPermissions: () => [
      { granted: mockCameraPermissionGranted },
      async () => {
        const permission = await mockRequestCameraPermission();
        mockCameraPermissionGranted = Boolean(permission.granted);
        return permission;
      },
    ],
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../api/services', () => ({
  mealService: {
    analyzePhoto: jest.fn(),
  },
}));

jest.mock('../api/services/meal-offline-queue', () => ({
  isTransientMealScanUploadError: (error: unknown) => {
    return error instanceof Error && /network|fetch|offline/i.test(error.message);
  },
  queueMealScanPhoto: (...args: any[]) => mockQueueMealScanPhoto(...args),
}));

jest.mock('../api/query', () => {
  const actual = jest.requireActual('../api/query');
  return {
    ...actual,
    invalidateApiQuery: jest.fn(actual.invalidateApiQuery),
  };
});

const mockAnalyzePhoto = mealService.analyzePhoto as jest.MockedFunction<typeof mealService.analyzePhoto>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<typeof ImagePicker.requestMediaLibraryPermissionsAsync>;
const mockLaunchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.MockedFunction<typeof ImagePicker.launchImageLibraryAsync>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalyzePhoto.mockReset();
  mockRequestCameraPermission.mockReset();
  mockTakePictureAsync.mockReset();
  mockRequestMediaLibraryPermissionsAsync.mockReset();
  mockLaunchImageLibraryAsync.mockReset();
  mockQueueMealScanPhoto.mockReset();
  mockLatestCameraProps = null;
  mockCameraPermissionGranted = true;
  mockCameraReadyCalls = 0;
  mockRequestCameraPermission.mockResolvedValue({ granted: true });
  mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>);
  mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
  mockTakePictureAsync.mockResolvedValue({ uri: 'file:///meal.jpg', width: 100, height: 100, format: 'jpg' });
  mockAnalyzePhoto.mockResolvedValue({ meal_id: 'meal-1', job_id: 'job-1', status: 'processing' });
});

describe('MealScanCameraScreen', () => {
  it('captures from CameraView and submits the image to Core analysis', async () => {
    const { getByLabelText } = render(<MealScanCameraScreen />);

    await waitFor(() => expect(mockLatestCameraProps?.facing).toBe('back'));
    await waitFor(() => expect(mockCameraReadyCalls).toBe(1));
    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await waitFor(() => {
      expect(mockAnalyzePhoto).toHaveBeenCalledWith(expect.objectContaining({
        image: expect.objectContaining({
          uri: 'file:///meal.jpg',
          name: 'meal-scan.jpg',
          type: 'image/jpeg',
        }),
      }));
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.');
    expect(mockPush).toHaveBeenCalledWith('/meals/scan-analyzing?mealId=meal-1&jobId=job-1&imageUri=file%3A%2F%2F%2Fmeal.jpg');
  });

  it('uploads a selected photo library image to Core analysis', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file:///library-meal.png',
        fileName: 'library-meal.png',
        mimeType: 'image/png',
        width: 120,
        height: 120,
      }],
    } as Awaited<ReturnType<typeof ImagePicker.launchImageLibraryAsync>>);
    const { getByLabelText } = render(<MealScanCameraScreen />);

    fireEvent.press(getByLabelText('meals.openPhotoLibrary'));

    await waitFor(() => expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1));
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    await waitFor(() => {
      expect(mockAnalyzePhoto).toHaveBeenCalledWith(expect.objectContaining({
        image: expect.objectContaining({
          uri: 'file:///library-meal.png',
          name: 'library-meal.png',
          type: 'image/png',
        }),
      }));
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.');
    expect(mockPush).toHaveBeenCalledWith('/meals/scan-analyzing?mealId=meal-1&jobId=job-1&imageUri=file%3A%2F%2F%2Flibrary-meal.png');
  });

  it('shows an explicit camera permission prompt before mounting the live preview', async () => {
    mockCameraPermissionGranted = false;
    const { getByLabelText, queryByTestId } = render(<MealScanCameraScreen />);

    expect(queryByTestId('camera-view')).toBeNull();
    fireEvent.press(getByLabelText('meals.cameraPermissionAction'));

    await waitFor(() => expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(queryByTestId('camera-view')).toBeTruthy());
  });

  it('captures after first-time camera permission grant mounts the live preview', async () => {
    mockCameraPermissionGranted = false;
    const { getByLabelText, queryByText } = render(<MealScanCameraScreen />);

    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await waitFor(() => expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAnalyzePhoto).toHaveBeenCalledWith(expect.objectContaining({
      image: expect.objectContaining({ uri: 'file:///meal.jpg' }),
    })));
    expect(queryByText('meals.cameraNotReady')).toBeNull();
  });

  it('remounts the live camera after upload failure so the shutter can retry', async () => {
    mockAnalyzePhoto
      .mockRejectedValueOnce(new Error('Core unavailable'))
      .mockResolvedValueOnce({ meal_id: 'meal-1', job_id: 'job-1', status: 'processing' });
    const { findByText, getByLabelText } = render(<MealScanCameraScreen />);

    await waitFor(() => expect(mockLatestCameraProps?.facing).toBe('back'));
    await waitFor(() => expect(mockCameraReadyCalls).toBe(1));
    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await findByText('Core unavailable');
    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await waitFor(() => expect(mockAnalyzePhoto).toHaveBeenCalledTimes(2));
    expect(mockPush).toHaveBeenCalledWith('/meals/scan-analyzing?mealId=meal-1&jobId=job-1&imageUri=file%3A%2F%2F%2Fmeal.jpg');
  });

  it('queues transient upload failures for offline retry and navigates to queue state', async () => {
    mockQueueMealScanPhoto.mockResolvedValue({ id: 'queued-1' });
    mockAnalyzePhoto.mockRejectedValueOnce(new Error('Network request failed'));

    const { findByText, getByLabelText } = render(<MealScanCameraScreen />);

    await waitFor(() => expect(mockLatestCameraProps?.facing).toBe('back'));
    await waitFor(() => expect(mockCameraReadyCalls).toBe(1));
    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await findByText('meals.photoAnalysisQueued');
    await waitFor(() => expect(mockQueueMealScanPhoto).toHaveBeenCalledWith({
      uri: 'file:///meal.jpg',
      fileName: 'meal-scan.jpg',
      mimeType: 'image/jpeg',
      name: 'meals.scannedMealName',
    }));
    expect(mockPush).toHaveBeenCalledWith('/meals/scan-analyzing?queuedMealPhotoId=queued-1&imageUri=file%3A%2F%2F%2Fmeal.jpg');
  });

  it('remounts the live camera after analysis returns no meal id', async () => {
    mockAnalyzePhoto
      .mockResolvedValueOnce({ job_id: null, status: 'processing' })
      .mockResolvedValueOnce({ meal_id: 'meal-1', job_id: 'job-1', status: 'processing' });
    const { findByText, getByLabelText } = render(<MealScanCameraScreen />);

    await waitFor(() => expect(mockLatestCameraProps?.facing).toBe('back'));
    await waitFor(() => expect(mockCameraReadyCalls).toBe(1));
    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await findByText('meals.photoAnalysisNoMealId');
    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await waitFor(() => expect(mockAnalyzePhoto).toHaveBeenCalledTimes(2));
    expect(mockPush).toHaveBeenCalledWith('/meals/scan-analyzing?mealId=meal-1&jobId=job-1&imageUri=file%3A%2F%2F%2Fmeal.jpg');
  });

  it('toggles torch and camera facing in the live preview', async () => {
    const { getByLabelText } = render(<MealScanCameraScreen />);

    await waitFor(() => expect(mockLatestCameraProps?.enableTorch).toBe(false));
    fireEvent.press(getByLabelText('meals.flash'));
    await waitFor(() => expect(mockLatestCameraProps?.enableTorch).toBe(true));

    fireEvent.press(getByLabelText('meals.cameraSwitch'));
    await waitFor(() => {
      expect(mockLatestCameraProps?.facing).toBe('front');
      expect(mockLatestCameraProps?.enableTorch).toBe(false);
    });
  });

  it('captures after switching camera facing', async () => {
    const { getByLabelText } = render(<MealScanCameraScreen />);

    await waitFor(() => expect(mockLatestCameraProps?.facing).toBe('back'));
    await waitFor(() => expect(mockCameraReadyCalls).toBe(1));
    fireEvent.press(getByLabelText('meals.cameraSwitch'));
    await waitFor(() => expect(mockLatestCameraProps?.facing).toBe('front'));
    await waitFor(() => expect(mockCameraReadyCalls).toBeGreaterThan(1));

    fireEvent.press(getByLabelText('meals.takeMealPhoto'));

    await waitFor(() => {
      expect(mockAnalyzePhoto).toHaveBeenCalledWith(expect.objectContaining({
        image: expect.objectContaining({ uri: 'file:///meal.jpg' }),
      }));
    });
  });

  it('does not expose unsupported barcode scanning in the meal photo camera', async () => {
    const { queryByLabelText, UNSAFE_getAllByType } = render(<MealScanCameraScreen />);

    await waitFor(() => expect(mockLatestCameraProps).toBeTruthy());
    expect(UNSAFE_getAllByType(Pressable).map((button) => button.props.accessibilityLabel)).toEqual([
      'common.back',
      'meals.flash',
      'meals.openPhotoLibrary',
      'meals.takeMealPhoto',
      'meals.cameraSwitch',
    ]);
    expect(queryByLabelText('meals.barcodeScan')).toBeNull();
    expect(mockLatestCameraProps?.onBarcodeScanned).toBeUndefined();
    expect(mockLatestCameraProps?.barcodeScannerSettings).toBeUndefined();
    expect(mockAnalyzePhoto).not.toHaveBeenCalled();
  });
});
