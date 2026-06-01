import type { CameraCapturedPicture } from 'expo-camera';
import type { ImagePickerAsset } from 'expo-image-picker';

export interface MealScanImageFile {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

export function imageFileFromPickerAsset(asset: ImagePickerAsset): MealScanImageFile {
  const ext = asset.mimeType?.split('/')[1] || 'jpg';
  return {
    uri: asset.uri,
    fileName: asset.fileName || `meal-scan.${ext === 'jpeg' ? 'jpg' : ext}`,
    mimeType: asset.mimeType || 'image/jpeg',
    fileSize: asset.fileSize,
  };
}

export function imageFileFromCameraPicture(picture: CameraCapturedPicture): MealScanImageFile {
  const format = picture.format === 'png' ? 'png' : 'jpg';
  return {
    uri: picture.uri,
    fileName: `meal-scan.${format}`,
    mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
  };
}
