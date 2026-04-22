import type { UserProfileUpdate } from "@/api/endpoints/users";

export interface ProfileDraftInput {
  full_name: string;
  phone: string;
  address: string;
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}

export type ProfilePayloadBuildResult =
  | { ok: true; payload: UserProfileUpdate }
  | { ok: false; errorKey: "profile.emergencyContactIncomplete" };

/**
 * Shape PATCH /v1/users/me from the profile form. Blank secondary fields send
 * explicit `null` so the server clears stored values (`exclude_unset` on the backend).
 */
export function buildProfileUpdatePayload(draft: ProfileDraftInput): ProfilePayloadBuildResult {
  const payload: UserProfileUpdate = {};
  const name = draft.full_name.trim();
  if (name) payload.full_name = name;

  payload.phone = draft.phone.trim() ? draft.phone.trim() : null;
  payload.address = draft.address.trim() ? draft.address.trim() : null;
  payload.blood_type = draft.blood_type.trim() ? draft.blood_type.trim() : null;

  const ecName = draft.emergency_contact_name.trim();
  const ecPhone = draft.emergency_contact_phone.trim();
  const ecRel = draft.emergency_contact_relationship.trim();
  const anyEc = !!(ecName || ecPhone || ecRel);

  if (!anyEc) {
    payload.emergency_contacts = null;
  } else if (ecName && ecPhone) {
    payload.emergency_contacts = [
      { name: ecName, phone: ecPhone, relationship: ecRel || "Other" },
    ];
  } else {
    return { ok: false, errorKey: "profile.emergencyContactIncomplete" };
  }

  return { ok: true, payload };
}
