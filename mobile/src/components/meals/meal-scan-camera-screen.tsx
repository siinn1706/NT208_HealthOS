import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { mealService } from '../../api/services';
import {
  isTransientMealScanUploadError,
  queueMealScanPhoto,
} from '../../api/services/meal-offline-queue';
import { invalidateApiQuery } from '../../api/query';
import { validateImageFile } from '../../utils/file-validation';
import { MealScanBottomControls, MealScanTopBar } from './meal-scan-camera-controls';
import { imageFileFromCameraPicture, imageFileFromPickerAsset, type MealScanImageFile } from './meal-scan-camera-file';
import { MealScanCameraViewfinder } from './meal-scan-camera-viewfinder';

const BG = '#0B0F14';

export function MealScanCameraScreen() {
  const router = useRouter();
  const { t: i18n } = useTranslation();
  const cameraRef = useRef<CameraView | null>(null);
  const pendingCaptureAfterPermissionRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [permissionGrantedAfterPrompt, setPermissionGrantedAfterPrompt] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const hasCameraPermission = Boolean(cameraPermission?.granted || permissionGrantedAfterPrompt);

  function clearPreviewForRetry() {
    setPreviewUri(null);
    setCameraReady(Boolean(cameraRef.current));
  }

  async function uploadImageFile(file: MealScanImageFile) {
    setError(null);
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setError(i18n(validation.messageKey ?? 'validation.image.bad_mime', validation.messageParams));
      return;
    }

    setPreviewUri(file.uri);
    setCameraReady(false);
    setUploading(true);
    try {
      const analysis = await mealService.analyzePhoto({
        name: i18n('meals.scannedMealName'),
        image: {
          uri: file.uri,
          name: file.fileName,
          type: file.mimeType,
        },
      });
      invalidateApiQuery('meals.');
      const mealId = analysis.meal_id;
      if (!mealId) {
        clearPreviewForRetry();
        setError(i18n('meals.photoAnalysisNoMealId'));
        return;
      }
      const params = new URLSearchParams({ mealId });
      if (analysis.job_id) params.set('jobId', analysis.job_id);
      params.set('imageUri', file.uri);
      router.push(`/meals/scan-analyzing?${params.toString()}` as never);
    } catch (err) {
      if (isTransientMealScanUploadError(err)) {
        try {
          const queued = await queueMealScanPhoto({
            uri: file.uri,
            fileName: file.fileName,
            mimeType: file.mimeType,
            name: i18n('meals.scannedMealName'),
          });
          const params = new URLSearchParams({
            queuedMealPhotoId: queued.id,
            imageUri: file.uri,
          });
          setError(i18n('meals.photoAnalysisQueued'));
          router.push(`/meals/scan-analyzing?${params.toString()}` as never);
        } catch (queueErr) {
          clearPreviewForRetry();
          setError(queueErr instanceof Error ? queueErr.message : i18n('meals.uploadFailed'));
        }
        return;
      }
      clearPreviewForRetry();
      setError(err instanceof Error ? err.message : i18n('meals.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function ensureCameraPermission() {
    if (hasCameraPermission) return true;
    const permission = await requestCameraPermission();
    if (!permission.granted) {
      setError(i18n('meals.cameraPermissionRequired'));
      return false;
    }
    setPermissionGrantedAfterPrompt(true);
    return true;
  }

  function requestCameraPermissionFromPrompt() {
    void ensureCameraPermission();
  }

  async function captureMountedCameraPhoto() {
    if (!cameraRef.current) {
      setError(i18n('meals.cameraNotReady'));
      return;
    }
    const picture = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (!picture?.uri) {
      setError(i18n('meals.cameraCaptureFailed'));
      return;
    }
    await uploadImageFile(imageFileFromCameraPicture(picture));
  }

  async function capturePhoto() {
    if (uploading) return;
    setError(null);
    try {
      const hadCameraPermission = hasCameraPermission;
      if (!await ensureCameraPermission()) return;
      if (!hadCameraPermission) {
        pendingCaptureAfterPermissionRef.current = true;
        setCameraReady(false);
        return;
      }
      if (!cameraReady || !cameraRef.current) {
        setError(i18n('meals.cameraNotReady'));
        return;
      }
      await captureMountedCameraPhoto();
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('meals.cameraCaptureFailed'));
    }
  }

  function handleCameraReady() {
    setCameraReady(true);
    if (!pendingCaptureAfterPermissionRef.current || uploading) return;
    pendingCaptureAfterPermissionRef.current = false;
    void captureMountedCameraPhoto().catch((err) => {
      setError(err instanceof Error ? err.message : i18n('meals.cameraCaptureFailed'));
    });
  }

  async function launchLibrary() {
    if (uploading) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(i18n('meals.libraryPermissionRequired'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        await uploadImageFile(imageFileFromPickerAsset(result.assets[0]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('meals.uploadFailed'));
    }
  }

  function toggleTorch() {
    setTorchEnabled((current) => !current);
    setError(null);
  }

  function toggleCameraFacing() {
    setCameraFacing((current) => (current === 'back' ? 'front' : 'back'));
    setTorchEnabled(false);
    setCameraReady(false);
    setError(null);
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar style="light" />

      <MealScanTopBar
        torchEnabled={torchEnabled}
        onBack={() => router.back()}
        onToggleTorch={toggleTorch}
      />

      <MealScanCameraViewfinder
        cameraFacing={cameraFacing}
        cameraRef={cameraRef}
        cameraPermissionActionLabel={i18n('meals.cameraPermissionAction')}
        cameraPermissionBody={i18n('meals.cameraPermissionBody')}
        cameraPermissionTitle={i18n('meals.cameraPermissionTitle')}
        centerPlateLabel={i18n('meals.centerPlate')}
        hasCameraPermission={hasCameraPermission}
        loadingLabel={i18n('common.loading')}
        previewUri={previewUri}
        torchEnabled={torchEnabled}
        uploading={uploading}
        onCameraReady={handleCameraReady}
        onMountError={(message) => setError(message || i18n('meals.cameraNotReady'))}
        onRequestCameraPermission={requestCameraPermissionFromPrompt}
      />

      <MealScanBottomControls
        error={error}
        previewUri={previewUri}
        uploading={uploading}
        onCapturePhoto={capturePhoto}
        onLaunchLibrary={launchLibrary}
        onToggleCameraFacing={toggleCameraFacing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
});
