import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../client';
import { createIdempotencyKey } from '../client';

export interface MealScanQueuedPhoto {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  name: string;
  queuedAt: number;
  attemptCount: number;
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
  );
}

async function readQueue(): Promise<MealScanQueuedPhoto[]> {
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidQueueItem);
  } catch {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    return [];
  }
}

async function writeQueue(items: MealScanQueuedPhoto[]) {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
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
