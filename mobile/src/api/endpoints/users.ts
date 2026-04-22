import { apiFetch, apiUpload, unwrapData } from "../client";
import { appendFilePart, type FilePart } from "../formdata";
import type { SessionUser } from "@/auth/session";

/**
 * Mirrors backend `app/schemas/auth.py:UserProfileUpdate`.
 * Notes:
 *  - Backend uses `full_name` (NOT `name`).
 *  - `emergency_contacts` is an array of objects, NOT flat `emergency_contact_*` strings.
 *  - `medical_info` is a nested object, NOT flat `conditions`/`allergies`/`medications` arrays.
 *  - Setting `onboarding_completed: true` flips the user's status to "completed".
 */
export interface EmergencyContactInput {
  name: string;
  phone: string;
  relationship: string;
  email?: string;
}

export interface MedicalInfoInput {
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  notes?: string;
}

export interface UserProfileUpdate {
  full_name?: string;
  date_of_birth?: string; // YYYY-MM-DD
  gender?: "male" | "female" | "other";
  blood_type?: string | null;
  height_cm?: number;
  weight_kg?: number;
  phone?: string | null;
  address?: string | null;
  avatar_url?: string;
  emergency_contacts?: EmergencyContactInput[] | null;
  medical_info?: MedicalInfoInput;
  onboarding_completed?: boolean;
}

export async function fetchCurrentUser(): Promise<SessionUser> {
  const res = await apiFetch<{ data: SessionUser }>("/v1/users/me");
  return unwrapData(res);
}

export async function patchCurrentUser(
  payload: UserProfileUpdate
): Promise<SessionUser> {
  const res = await apiFetch<{ data: SessionUser }>("/v1/users/me", {
    method: "PATCH",
    body: payload,
  });
  return unwrapData(res);
}

export async function uploadAvatar(file: FilePart): Promise<SessionUser> {
  const formData = new FormData();
  appendFilePart(formData, "file", file);
  const res = await apiUpload<{ data: SessionUser }>(
    "/v1/users/me/avatar",
    formData
  );
  return unwrapData(res);
}

/**
 * Backend `app/schemas/chat.py:UserLookupResult` — `display_name` + `email` only.
 * No `username` or `name` fields.
 */
export interface UserLookupResult {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string | null;
}

export async function lookupUsers(query: string, limit = 10) {
  const res = await apiFetch<{ data: UserLookupResult[] }>(
    "/v1/users/lookup",
    { query: { q: query, limit } }
  );
  return unwrapData(res);
}
