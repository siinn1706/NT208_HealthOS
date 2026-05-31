import * as SecureStore from 'expo-secure-store';
import { createIdempotencyKey } from '../api/client';

const HEALTH_CONNECT_EXTERNAL_ACCOUNT_KEY = 'healthos.mobile.health_connect_external_account_id';
const HEALTH_CONNECT_DEVICE_ID_KEY = 'healthos.mobile.health_connect_device_id';

let externalAccountIdPromise: Promise<string> | null = null;

export async function getHealthConnectExternalAccountId(): Promise<string> {
  if (!externalAccountIdPromise) {
    externalAccountIdPromise = resolveHealthConnectExternalAccountId();
  }
  try {
    return await externalAccountIdPromise;
  } finally {
    externalAccountIdPromise = null;
  }
}

async function resolveHealthConnectExternalAccountId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(HEALTH_CONNECT_EXTERNAL_ACCOUNT_KEY);
  if (existing?.trim()) return existing;

  const next = `health-connect:${createIdempotencyKey()}`;
  await SecureStore.setItemAsync(HEALTH_CONNECT_EXTERNAL_ACCOUNT_KEY, next);
  return next;
}

export async function getStoredHealthConnectDeviceId(): Promise<string | null> {
  const existing = await SecureStore.getItemAsync(HEALTH_CONNECT_DEVICE_ID_KEY);
  return existing?.trim() || null;
}

export async function saveHealthConnectDeviceId(deviceId: string): Promise<void> {
  await SecureStore.setItemAsync(HEALTH_CONNECT_DEVICE_ID_KEY, deviceId);
}
