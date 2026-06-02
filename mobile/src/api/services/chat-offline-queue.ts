import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, createIdempotencyKey } from '../client';

export interface ChatImageQueueItem {
  id: string;
  user_id: string;
  conversation_id: string;
  uri: string;
  file_name: string;
  mime_type: string;
  name: string;
  caption: string;
  queued_at: number;
  attempt_count: number;
  file_size: number | null;
}

export interface ChatImageQueueInput {
  user_id: string;
  conversation_id: string;
  uri: string;
  file_name: string;
  mime_type: string;
  name: string;
  caption: string;
  file_size: number | null;
}

const QUEUE_STORAGE_KEY = 'chat-image-offline-queue:v1';
const MAX_QUEUE_SIZE = 20;

interface RawQueueRecord {
  id?: unknown;
  user_id?: unknown;
  conversation_id?: unknown;
  uri?: unknown;
  file_name?: unknown;
  mime_type?: unknown;
  name?: unknown;
  caption?: unknown;
  queued_at?: unknown;
  attempt_count?: unknown;
  file_size?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isValidQueueItem(value: unknown): value is ChatImageQueueItem {
  if (!isObject(value)) return false;
  const item = value as RawQueueRecord;

  return (
    typeof item.id === 'string'
    && typeof item.user_id === 'string'
    && typeof item.conversation_id === 'string'
    && typeof item.uri === 'string'
    && typeof item.file_name === 'string'
    && typeof item.mime_type === 'string'
    && typeof item.name === 'string'
    && typeof item.caption === 'string'
    && typeof item.queued_at === 'number'
    && typeof item.attempt_count === 'number'
    && (item.file_size === null || typeof item.file_size === 'number')
  );
}

async function readQueue(): Promise<ChatImageQueueItem[]> {
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

async function writeQueue(items: ChatImageQueueItem[]) {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
}

export async function queueChatImageUpload(input: ChatImageQueueInput): Promise<ChatImageQueueItem> {
  const queue = await readQueue();
  const item: ChatImageQueueItem = {
    id: createIdempotencyKey(),
    user_id: input.user_id,
    conversation_id: input.conversation_id,
    uri: input.uri,
    file_name: input.file_name,
    mime_type: input.mime_type,
    name: input.name,
    caption: input.caption,
    queued_at: Date.now(),
    attempt_count: 0,
    file_size: input.file_size,
  };

  const next = [...queue, item];
  if (next.length > MAX_QUEUE_SIZE) {
    next.splice(0, next.length - MAX_QUEUE_SIZE);
  }

  await writeQueue(next);
  return item;
}

export async function getQueuedChatImageUploads(input: { user_id: string; conversation_id: string; }): Promise<ChatImageQueueItem[]> {
  const queue = await readQueue();
  return queue
    .filter((item) => item.user_id === input.user_id && item.conversation_id === input.conversation_id)
    .sort((left, right) => left.queued_at - right.queued_at);
}

export async function removeQueuedChatImageUpload(input: { user_id: string; job_id: string; }): Promise<void> {
  const queue = await readQueue();
  const next = queue.filter((item) => !(item.id === input.job_id && item.user_id === input.user_id));
  await writeQueue(next);
}

export async function incrementQueuedChatImageAttempts(input: { user_id: string; job_id: string; }): Promise<void> {
  const queue = await readQueue();
  const next = queue.map((item) => {
    if (item.id !== input.job_id || item.user_id !== input.user_id) return item;
    return { ...item, attempt_count: item.attempt_count + 1 };
  });
  await writeQueue(next);
}

export async function clearQueuedChatImageUploadsForUser(userId: string): Promise<void> {
  const queue = await readQueue();
  const next = queue.filter((item) => item.user_id !== userId);
  await writeQueue(next);
}

export function isTransientChatImageUploadError(error: unknown): boolean {
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
