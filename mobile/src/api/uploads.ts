import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { ApiError } from "./errors";

/**
 * Centralized image-upload preparation. Caller hands us a picked or captured
 * image URI; we resize, compress, validate the resulting file size against
 * the backend's cap, and return a payload ready for FormData.
 *
 * Why this lives here:
 *   - Single source of truth for the size limits backend enforces (avoids
 *     drift between meals and avatar caps).
 *   - Fail fast — a 12 MB photo throws `FILE_TOO_LARGE` BEFORE we burn
 *     mobile data uploading bytes the server will reject with 413.
 *   - Strips EXIF metadata as a side effect of going through ImageManipulator
 *     (privacy + smaller payload).
 *
 * Backend caps cited:
 *   - Meals:  `_MAX_UPLOAD_BYTES = 10 * 1024 * 1024` in
 *             `backend/app/api/v1/endpoints/meals.py`
 *   - Avatar: `_MAX_AVATAR_BYTES = 2 * 1024 * 1024` in
 *             `backend/app/api/v1/endpoints/users.py`
 */

export type UploadKind = "meal" | "avatar";

// Re-export the formdata helpers for callers that import `uploads`
// already (they pull in the native dep chain anyway via prepareImage).
export { appendFilePart, type FilePart } from "./formdata";
import type { FilePart } from "./formdata";

interface PreparedImage extends FilePart {
  size: number;
}

interface PrepareImageOptions {
  /** Source URI from `expo-image-picker` / `expo-camera`. */
  sourceUri: string;
  /** Determines the byte cap and recommended max dimension. */
  kind: UploadKind;
  /**
   * Override the default max width per kind. Default is 1600 for meals
   * (analysis-friendly) and 512 for avatars (display-friendly).
   */
  maxWidth?: number;
  /** JPEG compression quality (0..1). Default 0.7. */
  quality?: number;
  /** AbortSignal — if aborted before/during, throws with code AbortError. */
  signal?: AbortSignal;
}

const KIND_LIMITS: Record<UploadKind, { bytes: number; defaultMaxWidth: number; humanCap: string }> = {
  meal:   { bytes: 10 * 1024 * 1024, defaultMaxWidth: 1600, humanCap: "10 MB" },
  avatar: {  bytes: 2 * 1024 * 1024, defaultMaxWidth:  512, humanCap: "2 MB"  },
};

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    const err = new Error("Upload cancelled");
    err.name = "AbortError";
    throw err;
  }
}

function fileNameFromUri(uri: string, fallback: string): string {
  const base = uri.split(/[/\\]/).pop();
  if (!base) return fallback;
  // Strip query strings (some Android URIs carry them).
  return base.split("?")[0] ?? fallback;
}

export async function prepareImageUpload(
  options: PrepareImageOptions
): Promise<PreparedImage> {
  const limit = KIND_LIMITS[options.kind];
  const maxWidth = options.maxWidth ?? limit.defaultMaxWidth;
  const quality = options.quality ?? 0.7;

  checkAborted(options.signal);

  // Resize + compress + JPEG encode. The manipulator strips EXIF as a side
  // effect, which is fine — we don't need orientation since the operation
  // applies it before resizing.
  const manipulated = await ImageManipulator.manipulateAsync(
    options.sourceUri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );
  checkAborted(options.signal);

  // Read the actual file size from disk so the size check is honest about
  // the bytes we're about to send (manipulator's quality knob is fuzzy).
  const info = await FileSystem.getInfoAsync(manipulated.uri, { size: true });
  if (!info.exists) {
    throw new ApiError(
      "UPLOAD_FAILED",
      "Couldn't read the prepared image. Try again.",
      0
    );
  }
  const size = (info as { size?: number }).size ?? 0;

  if (size > limit.bytes) {
    const mb = (size / (1024 * 1024)).toFixed(1);
    throw new ApiError(
      "FILE_TOO_LARGE",
      `Image is ${mb} MB after compression — limit is ${limit.humanCap}. Try a smaller photo.`,
      413
    );
  }

  const fallbackName = options.kind === "avatar" ? "avatar.jpg" : "meal.jpg";
  return {
    uri: manipulated.uri,
    name: fileNameFromUri(manipulated.uri, fallbackName),
    type: "image/jpeg",
    size,
  };
}

/**
 * Best-effort cleanup of the manipulated temp file. Call after the upload
 * resolves OR rejects so the temp directory doesn't accumulate over time.
 * Failures are swallowed because the OS will clean tmp/ eventually anyway.
 */
export async function discardPreparedImage(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    /* ignore */
  }
}
