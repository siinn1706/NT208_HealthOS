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

jest.mock('../api/client', () => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    ApiError,
    createIdempotencyKey: jest.fn(() => 'mock-id-key'),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  queueChatImageUpload,
  getQueuedChatImageUploads,
  removeQueuedChatImageUpload,
  incrementQueuedChatImageAttempts,
  clearQueuedChatImageUploadsForUser,
  isTransientChatImageUploadError,
} from '../api/services/chat-offline-queue';
import { ApiError } from '../api/client';

const makeInput = (overrides = {}) => ({
  user_id: 'u1',
  conversation_id: 'conv1',
  uri: 'file://photo.jpg',
  file_name: 'photo.jpg',
  mime_type: 'image/jpeg',
  name: 'Photo',
  caption: 'My photo',
  file_size: 1024,
  ...overrides,
});

/**
 * Reads the last `setItem` call and unwraps the fake-encrypted envelope
 * (produced by the passthrough mock) to return the stored queue as a
 * parsed array.
 */
function getStoredQueue(): unknown[] {
  const calls = setItemSpy.mock.calls as Array<[string, string]>;
  if (calls.length === 0) return [];
  const envelope = JSON.parse(calls[calls.length - 1][1]) as { iv: string; ct: string };
  return JSON.parse(envelope.ct) as unknown[];
}

/**
 * Serialises `items` into the fake-encrypted format so `getItem` can return
 * pre-populated data for read-path tests.
 */
function encodeStoredQueue(items: unknown[]): string {
  return JSON.stringify({ iv: 'fake-iv', ct: JSON.stringify(items) });
}

let getItemSpy: jest.SpyInstance;
let setItemSpy: jest.SpyInstance;
let removeItemSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  getItemSpy = jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null);
  setItemSpy = jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
  removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('queueChatImageUpload', () => {
  it('queues an item and persists to storage', async () => {
    const item = await queueChatImageUpload(makeInput());
    expect(item.id).toBe('mock-id-key');
    expect(item.user_id).toBe('u1');
    expect(item.attempt_count).toBe(0);
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('stores data as an encrypted envelope (iv + ct fields)', async () => {
    await queueChatImageUpload(makeInput());
    const rawStored = (setItemSpy.mock.calls[0] as [string, string])[1];
    const envelope = JSON.parse(rawStored);
    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('ct');
  });

  it('preserves last MAX_QUEUE_SIZE=20 items when queue overflows', async () => {
    const existing = Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i}`,
      user_id: 'u1',
      conversation_id: 'conv1',
      uri: 'file://x.jpg',
      file_name: 'x.jpg',
      mime_type: 'image/jpeg',
      name: 'X',
      caption: '',
      queued_at: i,
      attempt_count: 0,
      file_size: null,
    }));
    // Pre-populate storage in encrypted envelope format.
    getItemSpy.mockResolvedValueOnce(encodeStoredQueue(existing));

    await queueChatImageUpload(makeInput());
    const stored = getStoredQueue();
    expect(stored).toHaveLength(20);
    // Oldest item evicted; newest item is last.
    expect((stored[19] as { id: string }).id).toBe('mock-id-key');
  });
});

describe('getQueuedChatImageUploads', () => {
  it('returns empty array when storage is empty', async () => {
    const result = await getQueuedChatImageUploads({ user_id: 'u1', conversation_id: 'conv1' });
    expect(result).toEqual([]);
  });

  it('filters by user_id and conversation_id', async () => {
    const items = [
      { id: 'a', user_id: 'u1', conversation_id: 'conv1', uri: 'f', file_name: 'f', mime_type: 'm', name: 'n', caption: '', queued_at: 1, attempt_count: 0, file_size: null },
      { id: 'b', user_id: 'u2', conversation_id: 'conv1', uri: 'f', file_name: 'f', mime_type: 'm', name: 'n', caption: '', queued_at: 2, attempt_count: 0, file_size: null },
    ];
    getItemSpy.mockResolvedValueOnce(encodeStoredQueue(items));
    const result = await getQueuedChatImageUploads({ user_id: 'u1', conversation_id: 'conv1' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('migration path: accepts plaintext legacy JSON array without envelope', async () => {
    // Legacy format: plain JSON array written before encryption was introduced.
    const items = [
      { id: 'legacy', user_id: 'u1', conversation_id: 'conv1', uri: 'f', file_name: 'f', mime_type: 'm', name: 'n', caption: '', queued_at: 1, attempt_count: 0, file_size: null },
    ];
    getItemSpy.mockResolvedValueOnce(JSON.stringify(items));
    const result = await getQueuedChatImageUploads({ user_id: 'u1', conversation_id: 'conv1' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('legacy');
  });

  it('returns [] when decrypted content is not an array', async () => {
    getItemSpy.mockResolvedValueOnce(encodeStoredQueue([{}]));
    // Override decryptItem to return a non-array JSON string.
    const { decryptItem } = jest.requireMock('../lib/queue-encryption') as { decryptItem: jest.Mock };
    decryptItem.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));
    const result = await getQueuedChatImageUploads({ user_id: 'u1', conversation_id: 'conv1' });
    expect(result).toEqual([]);
  });

  it('removes corrupted storage and returns [] on JSON parse failure', async () => {
    getItemSpy.mockResolvedValueOnce('NOT_VALID_JSON{{{');
    const result = await getQueuedChatImageUploads({ user_id: 'u1', conversation_id: 'conv1' });
    expect(result).toEqual([]);
    expect(removeItemSpy).toHaveBeenCalled();
  });
});

describe('removeQueuedChatImageUpload', () => {
  it('removes item matching job_id and user_id', async () => {
    const items = [
      { id: 'job-1', user_id: 'u1', conversation_id: 'conv1', uri: 'f', file_name: 'f', mime_type: 'm', name: 'n', caption: '', queued_at: 1, attempt_count: 0, file_size: null },
    ];
    getItemSpy.mockResolvedValueOnce(encodeStoredQueue(items));
    await removeQueuedChatImageUpload({ user_id: 'u1', job_id: 'job-1' });
    expect(getStoredQueue()).toHaveLength(0);
  });
});

describe('incrementQueuedChatImageAttempts', () => {
  it('increments attempt_count for matching item', async () => {
    const items = [
      { id: 'job-1', user_id: 'u1', conversation_id: 'conv1', uri: 'f', file_name: 'f', mime_type: 'm', name: 'n', caption: '', queued_at: 1, attempt_count: 2, file_size: null },
    ];
    getItemSpy.mockResolvedValueOnce(encodeStoredQueue(items));
    await incrementQueuedChatImageAttempts({ user_id: 'u1', job_id: 'job-1' });
    const stored = getStoredQueue() as Array<{ attempt_count: number }>;
    expect(stored[0].attempt_count).toBe(3);
  });
});

describe('clearQueuedChatImageUploadsForUser', () => {
  it('removes all items for a given user and re-encrypts remainder', async () => {
    const items = [
      { id: 'a', user_id: 'u1', conversation_id: 'conv1', uri: 'f', file_name: 'f', mime_type: 'm', name: 'n', caption: '', queued_at: 1, attempt_count: 0, file_size: null },
      { id: 'b', user_id: 'u2', conversation_id: 'conv1', uri: 'f', file_name: 'f', mime_type: 'm', name: 'n', caption: '', queued_at: 2, attempt_count: 0, file_size: null },
    ];
    getItemSpy.mockResolvedValueOnce(encodeStoredQueue(items));
    await clearQueuedChatImageUploadsForUser('u1');
    const stored = getStoredQueue() as Array<{ user_id: string }>;
    expect(stored).toHaveLength(1);
    expect(stored[0].user_id).toBe('u2');
  });
});

describe('isTransientChatImageUploadError', () => {
  it('returns true for CORE_UNREACHABLE ApiError', () => {
    const e = new (ApiError as any)('unreachable', 'CORE_UNREACHABLE', 503);
    expect(isTransientChatImageUploadError(e)).toBe(true);
  });

  it('returns true for 5xx ApiError', () => {
    const e = new (ApiError as any)('server error', 'SERVER_ERROR', 500);
    expect(isTransientChatImageUploadError(e)).toBe(true);
  });

  it('returns false for 4xx ApiError', () => {
    const e = new (ApiError as any)('bad request', 'VALIDATION_ERROR', 400);
    expect(isTransientChatImageUploadError(e)).toBe(false);
  });

  it('returns true for Error with network in message', () => {
    expect(isTransientChatImageUploadError(new Error('network failure'))).toBe(true);
    expect(isTransientChatImageUploadError(new Error('user is offline'))).toBe(true);
    expect(isTransientChatImageUploadError(new Error('fetch failed'))).toBe(true);
  });

  it('returns false for non-Error non-ApiError', () => {
    expect(isTransientChatImageUploadError('string error')).toBe(false);
    expect(isTransientChatImageUploadError(null)).toBe(false);
  });
});
