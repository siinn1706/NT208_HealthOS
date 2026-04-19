import { apiFetch } from "../client";

export type DeviceProvider = "apple_health" | "google_fit" | "garmin" | "fitbit";

export interface ConnectedDevice {
  id: string;
  provider: DeviceProvider | string;
  model?: string | null;
  connected_at?: string | null;
  last_synced_at?: string | null;
}

export async function listDevices(): Promise<ConnectedDevice[]> {
  const res = await apiFetch<{ data: ConnectedDevice[] }>("/v1/devices");
  return res.data;
}

export async function connectDevice(payload: {
  provider: DeviceProvider | string;
  model?: string;
}): Promise<ConnectedDevice> {
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
