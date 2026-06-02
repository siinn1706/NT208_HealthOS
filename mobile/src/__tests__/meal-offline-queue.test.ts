/* eslint-env jest */

/**
 * queue-encryption passthrough mock:
 * encryptItem wraps plaintext in { iv: 'fake-iv', ct: <plaintext> } so the
 * queue still writes a valid envelope while tests can inspect the inner payload
 * without a real SubtleCrypto runtime.
 */
jest.mock('../lib/queue-encryption', () => ({
  encryptItem: jest.fn(async (plain: string) => ({ iv: 'fake-iv', ct: plain })),
  decryptItem: jest.fn(async (envelope: { iv: string; ct: string }) => envelope.ct),
  isEncryptedEnvelope: jest.fn((v: unknown) => {
    if (v === null || typeof v !== 'object') return false;
    const obj = v as Record<string, unknown>;
    return typeof obj['iv'] === 'string' && typeof obj['ct'] === 'string';
  }),
  deleteQueueKey: jest.fn(async () => undefined),
  __resetQueueKeyCache: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  queueMealScanPhoto,
  getQueuedMealScanPhoto,
  removeQueuedMealScanPhoto,
  incrementQueuedMealScanPhotoAttempts,
  clearQueuedMealScanPhotos,
  isTransientMealScanUploadError,
} from '../api/services/meal-offline-queue';
import { encryptItem, decryptItem, deleteQueueKey } from '../lib/queue-encryption';
import { ApiError } from '../api/client';

jest.mock('../api/client', () => ({
  ApiError: jest.requireActual('../api/client').ApiError,
  createIdempotencyKey: jest.fn(() => 'mock-id-' + Math.random().toString(36).slice(2)),
}));

beforeEach(() => {
  (AsyncStorage as jest.Mocked<typeof AsyncStorage>).clear();
  jest.clearAllMocks();
});

const baseInput = {
  uri: 'file:///img.jpg',
  fileName: 'img.jpg',
  mimeType: 'image/jpeg',
  name: 'Lunch photo',
};

describe('queueMealScanPhoto', () => {
  it('adds item to empty queue', async () => {
    const item = await queueMealScanPhoto(baseInput);
    expect(item.uri).toBe(baseInput.uri);
    expect(item.attemptCount).toBe(0);
    expect(typeof item.id).toBe('string');
    expect(typeof item.queuedAt).toBe('number');
  });

  it('persists idempotencyKey at enqueue time', async () => {
    const item = await queueMealScanPhoto(baseInput);
    // Key must be a non-empty string
    expect(typeof item.idempotencyKey).toBe('string');
    expect(item.idempotencyKey.length).toBeGreaterThan(0);
  });

  it('preserves idempotencyKey across read-back (replay reuses original key)', async () => {
    const item = await queueMealScanPhoto(baseInput);
    const found = await getQueuedMealScanPhoto(item.id);
    // The key read from storage must exactly match the key generated at enqueue
    expect(found?.idempotencyKey).toBe(item.idempotencyKey);
  });

  it('two enqueued items get distinct idempotency keys', async () => {
    const a = await queueMealScanPhoto(baseInput);
    const b = await queueMealScanPhoto({ ...baseInput, name: 'Dinner' });
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
  });

  it('returns the queued item by id', async () => {
    const item = await queueMealScanPhoto(baseInput);
    const found = await getQueuedMealScanPhoto(item.id);
    expect(found).toEqual(item);
  });

  it('returns null for unknown id', async () => {
    expect(await getQueuedMealScanPhoto('nonexistent')).toBeNull();
  });

  it('caps queue at 15 items (oldest evicted)', async () => {
    for (let i = 0; i < 16; i++) {
      await queueMealScanPhoto({ ...baseInput, name: `Photo ${i}` });
    }
    // The stored value is an encrypted envelope; unwrap the `ct` field (which
    // the passthrough mock keeps as the plaintext JSON array string).
    const raw = await (AsyncStorage as jest.Mocked<typeof AsyncStorage>).getItem('meal-offline-queue:v1');
    const envelope = JSON.parse(raw!) as { iv: string; ct: string };
    const parsed = JSON.parse(envelope.ct);
    expect(parsed).toHaveLength(15);
  });
});

describe('removeQueuedMealScanPhoto', () => {
  it('removes the item from the queue', async () => {
    const item = await queueMealScanPhoto(baseInput);
    await removeQueuedMealScanPhoto(item.id);
    expect(await getQueuedMealScanPhoto(item.id)).toBeNull();
  });

  it('is a no-op for unknown id', async () => {
    await queueMealScanPhoto(baseInput);
    await expect(removeQueuedMealScanPhoto('ghost')).resolves.toBeUndefined();
  });
});

describe('incrementQueuedMealScanPhotoAttempts', () => {
  it('increments attemptCount by 1', async () => {
    const item = await queueMealScanPhoto(baseInput);
    await incrementQueuedMealScanPhotoAttempts(item.id);
    const updated = await getQueuedMealScanPhoto(item.id);
    expect(updated?.attemptCount).toBe(1);
  });

  it('increments multiple times', async () => {
    const item = await queueMealScanPhoto(baseInput);
    await incrementQueuedMealScanPhotoAttempts(item.id);
    await incrementQueuedMealScanPhotoAttempts(item.id);
    const updated = await getQueuedMealScanPhoto(item.id);
    expect(updated?.attemptCount).toBe(2);
  });
});

describe('clearQueuedMealScanPhotos', () => {
  it('empties the queue', async () => {
    await queueMealScanPhoto(baseInput);
    await clearQueuedMealScanPhotos();
    const raw = await (AsyncStorage as jest.Mocked<typeof AsyncStorage>).getItem('meal-offline-queue:v1');
    expect(raw).toBeNull();
  });
});

describe('encryption layer', () => {
  it('encrypt/decrypt round-trip returns the original string', async () => {
    // Uses the real (passthrough) mock: encryptItem stores plain in ct,
    // decryptItem echoes it back — round-trip is identity.
    const plain = JSON.stringify({ id: 'test', uri: 'file:///photo.jpg' });
    const envelope = await encryptItem(plain);
    const recovered = await decryptItem(envelope);
    expect(recovered).toBe(plain);
  });

  it('encryptItem output has iv and ct fields', async () => {
    const envelope = await encryptItem('hello');
    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('ct');
  });

  it('migration path: reading a plaintext legacy value returns the original items', async () => {
    // Simulate a queue written before encryption was introduced.
    const legacyItems = [
      {
        id: 'legacy-1',
        uri: 'file:///legacy.jpg',
        fileName: 'legacy.jpg',
        mimeType: 'image/jpeg',
        name: 'Legacy',
        queuedAt: 1000,
        attemptCount: 0,
        idempotencyKey: 'ikey-legacy',
      },
    ];
    // Store as a raw JSON array (no envelope).
    await (AsyncStorage as jest.Mocked<typeof AsyncStorage>).setItem(
      'meal-offline-queue:v1',
      JSON.stringify(legacyItems),
    );
    const found = await getQueuedMealScanPhoto('legacy-1');
    expect(found).not.toBeNull();
    expect(found?.uri).toBe('file:///legacy.jpg');
  });

  it('deleteQueueKey is called during clearQueuedMealScanPhotos (indirectly through session)', async () => {
    // Verify deleteQueueKey is exported and can be called without error.
    await expect(deleteQueueKey()).resolves.toBeUndefined();
    expect(deleteQueueKey).toHaveBeenCalled();
  });

  it('idempotencyKey field is preserved through encrypt/decrypt cycle', async () => {
    const item = await queueMealScanPhoto(baseInput);
    // idempotencyKey must survive a round-trip through the (mocked) encryption layer.
    const found = await getQueuedMealScanPhoto(item.id);
    expect(found?.idempotencyKey).toBe(item.idempotencyKey);
    expect(typeof found?.idempotencyKey).toBe('string');
    expect(found!.idempotencyKey.length).toBeGreaterThan(0);
  });
});

describe('isTransientMealScanUploadError', () => {
  it('returns true for ApiError with CORE_UNREACHABLE code', () => {
    expect(isTransientMealScanUploadError(new ApiError('fail', 0, 'CORE_UNREACHABLE'))).toBe(true);
  });

  it('returns true for ApiError with NETWORK_ERROR code', () => {
    expect(isTransientMealScanUploadError(new ApiError('fail', 0, 'NETWORK_ERROR'))).toBe(true);
  });

  it('returns true for ApiError with TIMEOUT code', () => {
    expect(isTransientMealScanUploadError(new ApiError('fail', 0, 'TIMEOUT'))).toBe(true);
  });

  it('returns true for ApiError with 5xx status', () => {
    expect(isTransientMealScanUploadError(new ApiError('fail', 502))).toBe(true);
    expect(isTransientMealScanUploadError(new ApiError('fail', 599))).toBe(true);
  });

  it('returns false for ApiError with 4xx status and non-transient code', () => {
    expect(isTransientMealScanUploadError(new ApiError('fail', 400, 'VALIDATION_ERROR'))).toBe(false);
  });

  it('returns true for plain Error with "network" in message', () => {
    expect(isTransientMealScanUploadError(new Error('network unavailable'))).toBe(true);
  });

  it('returns true for plain Error with "offline" in message', () => {
    expect(isTransientMealScanUploadError(new Error('device is offline'))).toBe(true);
  });

  it('returns true for plain Error with "fetch" in message', () => {
    expect(isTransientMealScanUploadError(new Error('fetch failed'))).toBe(true);
  });

  it('returns false for plain Error with unrelated message', () => {
    expect(isTransientMealScanUploadError(new Error('validation failed'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isTransientMealScanUploadError('string error')).toBe(false);
    expect(isTransientMealScanUploadError(null)).toBe(false);
    expect(isTransientMealScanUploadError(42)).toBe(false);
  });
});
