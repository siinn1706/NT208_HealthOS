import { apiRequest } from '../client';
import type { DataResponse } from '../../types/api';

export type DeviceProvider = 'apple_health' | 'google_fit' | 'garmin' | 'fitbit' | 'health_connect';

export interface ConnectedDevice {
  id: string;
  provider: string;
  name: string;
  model: string | null;
  connected: boolean;
  last_sync: string | null;
  battery_pct: number | null;
  device_label: string | null;
  external_account_id: string | null;
  scopes: string[] | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_sync_count: number | null;
  last_attempted_at: string | null;
}

export interface DeviceConnectBody {
  provider: DeviceProvider;
  model?: string | null;
  device_label?: string | null;
  external_account_id?: string | null;
  scopes?: string[] | null;
}

export interface DeviceSyncState {
  record_type: string;
  changes_token: string | null;
  last_synced_at: string | null;
  last_attempted_at: string | null;
  consecutive_failures: number;
}

export interface HealthRecordIn {
  external_id: string;
  external_version?: number | null;
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  source?: string;
  source_app?: string | null;
  recording_method?: string | null;
  is_deleted?: boolean;
}

export interface HealthDeletionIn {
  external_id: string;
}

export interface HealthIngestBatch {
  provider?: string;
  records?: HealthRecordIn[];
  deletions?: HealthDeletionIn[];
  next_changes_tokens?: Record<string, string | null | undefined>;
}

export interface HealthIngestResult {
  inserted: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: { external_id: string; reason: string }[];
}

export const deviceService = {
  async list() {
    const response = await apiRequest<DataResponse<ConnectedDevice[]>>('/v1/devices');
    return response.data;
  },

  async connect(body: DeviceConnectBody) {
    const response = await apiRequest<DataResponse<ConnectedDevice>>('/v1/devices', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async sync(deviceId: string) {
    const response = await apiRequest<DataResponse<ConnectedDevice>>(`/v1/devices/${encodeURIComponent(deviceId)}/sync`, {
      method: 'POST',
    });
    return response.data;
  },

  async disconnect(deviceId: string) {
    await apiRequest<void>(`/v1/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
  },

  async ingest(deviceId: string, body: HealthIngestBatch, idempotencyKey: string) {
    const response = await apiRequest<DataResponse<HealthIngestResult>>(`/v1/devices/${encodeURIComponent(deviceId)}/ingest`, {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data;
  },

  async getSyncState(deviceId: string) {
    const response = await apiRequest<DataResponse<DeviceSyncState[]>>(`/v1/devices/${encodeURIComponent(deviceId)}/sync-state`);
    return response.data;
  },

  async putSyncState(deviceId: string, tokens: Record<string, string | null>) {
    const response = await apiRequest<DataResponse<DeviceSyncState[]>>(`/v1/devices/${encodeURIComponent(deviceId)}/sync-state`, {
      method: 'PUT',
      json: { tokens },
    });
    return response.data;
  },

  async patchPermissions(deviceId: string, scopes: string[]) {
    const response = await apiRequest<DataResponse<ConnectedDevice>>(`/v1/devices/${encodeURIComponent(deviceId)}/permissions`, {
      method: 'PATCH',
      json: { scopes },
    });
    return response.data;
  },
};
