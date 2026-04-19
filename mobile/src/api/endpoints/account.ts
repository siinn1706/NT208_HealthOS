import { apiFetch, unwrapData } from "../client";

/**
 * Account export + soft delete + restore.
 * Backend source:
 *  - [users.py](backend/app/api/v1/endpoints/users.py) (`/me/export*`, `DELETE /me`, `POST /me/restore`)
 *  - [schemas/data_export.py](backend/app/schemas/data_export.py) for shapes
 */

export type DataExportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | string;

export interface DataExportRequest {
  id: string;
  status: DataExportStatus;
  requested_at: string;
  completed_at?: string | null;
  expires_at?: string | null;
  bytes?: number | null;
  error?: string | null;
}

export interface DataExportSignedUrl {
  url: string;
  expires_in_s: number;
  bytes: number;
  expires_at: string;
}

export async function requestDataExport(): Promise<DataExportRequest> {
  const res = await apiFetch<{ data: DataExportRequest }>("/v1/users/me/export", {
    method: "POST",
  });
  return unwrapData(res);
}

export async function getDataExportStatus(
  requestId: string
): Promise<DataExportRequest> {
  const res = await apiFetch<{ data: DataExportRequest }>(
    `/v1/users/me/export/${requestId}`
  );
  return unwrapData(res);
}

export async function getDataExportDownload(
  requestId: string
): Promise<DataExportSignedUrl> {
  const res = await apiFetch<{ data: DataExportSignedUrl }>(
    `/v1/users/me/export/${requestId}/download`
  );
  return unwrapData(res);
}

export interface DeleteAccountBody {
  confirmation_email: string;
  password?: string;
  reason?: string;
}

export interface DeleteAccountResult {
  status: "pending_deletion";
  purge_at?: string | null;
}

/**
 * Soft-delete: backend revokes the caller's JWT in the same transaction.
 * After this resolves, mobile must clear local session and route to login.
 */
export async function deleteAccount(
  body: DeleteAccountBody
): Promise<DeleteAccountResult> {
  const res = await apiFetch<{ data: DeleteAccountResult }>(
    "/v1/users/me",
    { method: "DELETE", body }
  );
  return unwrapData(res);
}

export async function restoreAccount(): Promise<{ status: "active" }> {
  const res = await apiFetch<{ data: { status: "active" } }>(
    "/v1/users/me/restore",
    { method: "POST" }
  );
  return unwrapData(res);
}
