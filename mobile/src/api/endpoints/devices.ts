import { apiFetch } from "../client";

export type DeviceProvider =
  | "apple_health"
  | "google_fit"
  | "garmin"
  | "fitbit"
  | "health_connect";

export interface ConnectedDevice {
  id: string;
  provider: DeviceProvider | string;
  name?: string | null;
  model?: string | null;
  connected?: boolean;
  connected_at?: string | null;
  last_synced_at?: string | null;
  last_sync?: string | null;
  // Health Connect additions — null for legacy stub providers.
  device_label?: string | null;
  external_account_id?: string | null;
  scopes?: string[] | null;
  last_sync_status?: "ok" | "partial" | "permission_denied" | "error" | null;
  last_sync_error?: string | null;
  last_sync_count?: number | null;
  last_attempted_at?: string | null;
}

export interface ConnectDevicePayload {
  provider: DeviceProvider | string;
  model?: string;
  device_label?: string;
  /** HC source-app package name; omit for legacy stub providers. */
  external_account_id?: string;
  /** Granted record-type scopes when provider is "health_connect". */
  scopes?: string[];
}

export async function listDevices(): Promise<ConnectedDevice[]> {
  const res = await apiFetch<{ data: ConnectedDevice[] }>("/v1/devices");
  return res.data;
}

export async function connectDevice(
  payload: ConnectDevicePayload
): Promise<ConnectedDevice> {
  const res = await apiFetch<{ data: ConnectedDevice }>("/v1/devices", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function syncDevice(id: string): Promise<ConnectedDevice> {
  const res = await apiFetch<{ data: ConnectedDevice }>(`/v1/devices/${id}/sync`, {
    method: "POST",
  });
  return res.data;
}

export async function disconnectDevice(id: string): Promise<void> {
  await apiFetch<null>(`/v1/devices/${id}`, { method: "DELETE" });
}

/**
 * Push the currently-granted Health Connect scopes to Core BE so the
 * device row's `last_sync_status` reflects out-of-band permission changes
 * (user revoked or re-granted in Android Settings). The backend audits
 * the transition and adjusts the status banner.
 */
export async function patchDevicePermissions(
  id: string,
  scopes: string[]
): Promise<ConnectedDevice> {
  const res = await apiFetch<{ data: ConnectedDevice }>(
    `/v1/devices/${id}/permissions`,
    {
      method: "PATCH",
      body: { scopes },
      retry: false,
    }
  );
  return res.data;
}
