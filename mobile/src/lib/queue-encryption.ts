/**
 * AES-GCM encryption layer for AsyncStorage offline queues.
 *
 * Key lifecycle:
 *   - One 256-bit AES-GCM key is generated per install and stored in the OS
 *     keychain via expo-secure-store (Keychain on iOS, Keystore on Android).
 *   - The key is derived lazily on first use and cached in-process to avoid
 *     repeated SecureStore round-trips within a session.
 *   - On logout, `deleteQueueKey()` evicts the key from the keychain; any
 *     remaining ciphertext in AsyncStorage is permanently unreadable.
 *
 * Runtime requirement:
 *   - `crypto.subtle` (SubtleCrypto) — available in React Native 0.73+ via
 *     Hermes' built-in polyfill. This project runs RN 0.79.6, so no shim is
 *     needed.
 *   - `expo-crypto` — used only for `getRandomBytesAsync` (CSPRNG). Already
 *     in package.json as `expo-crypto ~14.1.5`.
 *   - `expo-secure-store` — Keychain/Keystore storage for the root key.
 *     Already in package.json as `expo-secure-store ~14.2.4`.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY_NAME = 'queue.aesKey.v1';
const KEY_BYTE_LENGTH = 32; // 256-bit key for AES-GCM
const IV_BYTE_LENGTH = 12;  // 96-bit IV is standard for AES-GCM

// In-process cache: avoids SecureStore round-trips on every enqueue/dequeue.
let _cachedKey: CryptoKey | null = null;

/**
 * Returns the session's AES-GCM CryptoKey, creating and storing it on first
 * call. Subsequent calls within the same process return the cached value.
 */
async function getOrCreateQueueKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  let b64 = await SecureStore.getItemAsync(KEY_NAME);
  if (!b64) {
    // First install — generate a new random key and persist it in the keychain.
    const raw = await Crypto.getRandomBytesAsync(KEY_BYTE_LENGTH);
    b64 = Buffer.from(raw).toString('base64');
    await SecureStore.setItemAsync(KEY_NAME, b64);
  }

  const raw = Buffer.from(b64, 'base64');
  const key = await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    false,          // not extractable
    ['encrypt', 'decrypt'],
  );
  _cachedKey = key;
  return key;
}

/** Wire format stored in AsyncStorage for an encrypted queue item. */
export interface EncryptedEnvelope {
  /** base64-encoded 96-bit IV */
  iv: string;
  /** base64-encoded AES-GCM ciphertext (includes 128-bit authentication tag) */
  ct: string;
}

/**
 * Returns true when a parsed value looks like a valid EncryptedEnvelope.
 * Used in the read-path migration check: values written before encryption
 * was introduced are plain JSON objects without `iv` / `ct`.
 */
export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['iv'] === 'string' && typeof obj['ct'] === 'string';
}

/**
 * Encrypts a plaintext string to an `EncryptedEnvelope`.
 * A fresh random IV is generated for every call (AES-GCM nonce reuse would be
 * catastrophic, so we never reuse IVs even across identical plaintexts).
 */
export async function encryptItem(plain: string): Promise<EncryptedEnvelope> {
  const key = await getOrCreateQueueKey();
  const iv = await Crypto.getRandomBytesAsync(IV_BYTE_LENGTH);
  const encoded = new TextEncoder().encode(plain);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return {
    iv: Buffer.from(iv).toString('base64'),
    ct: Buffer.from(ciphertext).toString('base64'),
  };
}

/**
 * Decrypts an `EncryptedEnvelope` produced by `encryptItem`.
 * Throws if the authentication tag is invalid (tampered or wrong key).
 */
export async function decryptItem(envelope: EncryptedEnvelope): Promise<string> {
  const key = await getOrCreateQueueKey();
  const iv = Buffer.from(envelope.iv, 'base64');
  const ct = Buffer.from(envelope.ct, 'base64');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct,
  );
  return new TextDecoder().decode(plain);
}

/**
 * Removes the AES-GCM root key from the OS keychain and clears the in-process
 * cache. Must be called on logout so that any ciphertext remaining in
 * AsyncStorage becomes permanently unreadable.
 *
 * Note: AsyncStorage entries are removed by the queue's own `clear*` helpers
 * (clearQueuedMealScanPhotos, clearQueuedChatImageUploadsForUser). Call those
 * first, then call this so clearing and key deletion happen in a safe order.
 */
export async function deleteQueueKey(): Promise<void> {
  _cachedKey = null;
  await SecureStore.deleteItemAsync(KEY_NAME);
}

/**
 * Resets the in-process key cache without touching the keychain.
 * Exposed for testing only — do not call in production code.
 * @internal
 */
export function __resetQueueKeyCache(): void {
  _cachedKey = null;
}
