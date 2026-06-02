import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../client';
import { createIdempotencyKey } from '../client';
import {
  decryptItem,
  encryptItem,
  isEncryptedEnvelope,
} from '../../lib/queue-encryption';

export interface MealScanQueuedPhoto {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  name: string;
  queuedAt: number;
  attemptCount: number;
  /**
   * Stable idempotency key generated at enqueue time.
   * Preserved across reconnect-replay so the server can deduplicate requests
   * that are retried after a network interruption.
   * Legacy items (persisted before this field was added) will have this as
   * undefined — the replay path generates a fresh key for those via nullish
   * coalescing so they still get a key, just not the original one.
   */
  idempotencyKey: string;
}

export interface MealScanQueuedPhotoInput {
  uri: string;
  fileName: string;
  mimeType: string;
  name: string;
}

const QUEUE_STORAGE_KEY = 'meal-offline-queue:v1';
const MAX_QUEUE_SIZE = 15;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isValidQueueItem(value: unknown): value is MealScanQueuedPhoto {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string'
    && typeof value.uri === 'string'
    && typeof value.fileName === 'string'
    && typeof value.mimeType === 'string'
    && typeof value.name === 'string'
    && typeof value.queuedAt === 'number'
    && typeof value.attemptCount === 'number'
    // idempotencyKey is optional for backward compat with legacy persisted items;
    // replay callers must use `item.idempotencyKey ?? newIdempotencyKey()` pattern
    && (value.idempotencyKey === undefined || typeof value.idempotencyKey === 'string')
  );
}

/**
 * Reads the raw AsyncStorage value and decrypts it.
 *
 * Migration path: items written before encryption was introduced are stored as
 * a plain JSON array (no `iv`/`ct` envelope). We detect those by checking for
 * the envelope shape; if absent, we parse the value as plaintext so existing
 * queued items are not lost on upgrade. The next `writeQueue` call will
 * re-persist them encrypted.
 */
async function readQueue(): Promise<MealScanQueuedPhoto[]> {
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const outer = JSON.parse(raw);

    let arrayJson: string;
    if (isEncryptedEnvelope(outer)) {
      // Normal path: decrypt the ciphertext to get the JSON array string.
      arrayJson = await decryptItem(outer);
    } else {
      // Migration path: plaintext legacy data — accept as-is this one time.
      // Count is telemetry-only; no PHI is logged.
      if (__DEV__) {
        console.warn('[meal-offline-queue] plaintext legacy data detected; will re-encrypt on next write');
      }
      arrayJson = raw;
    }

    const parsed = JSON.parse(arrayJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidQueueItem);
  } catch {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    return [];
  }
}

/**
 * Encrypts the queue array and writes the `EncryptedEnvelope` to AsyncStorage.
 */
async function writeQueue(items: MealScanQueuedPhoto[]) {
  const envelope = await encryptItem(JSON.stringify(items));
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(envelope));
}

export function isTransientMealScanUploadError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.code === 'CORE_UNREACHABLE' || error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') return true;
    if (error.status >= 500 && error.status <= 599) return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network') || message.includes('offline') || message.includes('fetch');
  }
  return false;
}

export async function queueMealScanPhoto(input: MealScanQueuedPhotoInput): Promise<MealScanQueuedPhoto> {
  const queue = await readQueue();
  const item: MealScanQueuedPhoto = {
    id: createIdempotencyKey(),
    uri: input.uri,
    fileName: input.fileName,
    mimeType: input.mimeType,
    name: input.name,
    queuedAt: Date.now(),
    attemptCount: 0,
    // Generate idempotencyKey at enqueue time so reconnect-replay reuses the
    // same key rather than generating a new one — prevents duplicate meals on
    // the server when a retry arrives after the original request succeeded.
    idempotencyKey: createIdempotencyKey(),
  };
  const next = [...queue, item];
  if (next.length > MAX_QUEUE_SIZE) {
    next.splice(0, next.length - MAX_QUEUE_SIZE);
  }
  await writeQueue(next);
  return item;
}

export async function getQueuedMealScanPhoto(id: string): Promise<MealScanQueuedPhoto | null> {
  const queue = await readQueue();
  return queue.find((item) => item.id === id) ?? null;
}

export async function removeQueuedMealScanPhoto(id: string): Promise<void> {
  const queue = await readQueue();
  const next = queue.filter((item) => item.id !== id);
  await writeQueue(next);
}

export async function incrementQueuedMealScanPhotoAttempts(id: string): Promise<void> {
  const queue = await readQueue();
  const next = queue.map((item) => {
    if (item.id !== id) return item;
    return { ...item, attemptCount: item.attemptCount + 1 };
  });
  await writeQueue(next);
}

export async function clearQueuedMealScanPhotos(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
}
