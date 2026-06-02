/**
 * photo-sanitizer.ts — Mobile EXIF / PHI stripping for photo uploads.
 *
 * Health-app photos may carry EXIF metadata (GPS coordinates, device serial,
 * capture timestamp) which is PHI.  expo-image-manipulator re-encodes the
 * image through a native pipeline that discards all metadata — only pixel
 * data survives.
 *
 * API used: ImageManipulator.manipulate(uri) → context.renderAsync() → ref.saveAsync()
 * This is the non-deprecated SDK 52+ API (manipulateAsync is deprecated).
 *
 * Usage:
 *   const clean = await sanitizePhotoUri(rawUri);
 *   // use clean.uri instead of the original uri
 */

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Re-encodes the photo at `uri` using expo-image-manipulator, dropping all
 * EXIF metadata in the process.  Returns the sanitized local URI.
 *
 * No geometric transforms are applied — re-encode only.  compress: 0.85
 * matches the frontend quality cap per security spec (must not go below 0.85).
 *
 * Throws if the manipulator fails (e.g. file not found, out of disk space).
 */
export async function sanitizePhotoUri(uri: string): Promise<{ uri: string }> {
  // manipulate() creates a context; renderAsync() applies transforms on the
  // native background thread; saveAsync() writes the clean re-encoded file.
  const context = ImageManipulator.manipulate(uri);
  const imageRef = await context.renderAsync();
  const result = await imageRef.saveAsync({
    compress: 0.85,
    format: SaveFormat.JPEG,
  });

  // Release native shared objects to free memory immediately.
  imageRef.release();
  context.release();

  return { uri: result.uri };
}
