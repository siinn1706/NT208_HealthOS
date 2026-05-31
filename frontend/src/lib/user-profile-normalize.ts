import type { UserProfile } from "@/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeInsurance(value: any) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.provider !== "string" || typeof value.policy_number !== "string") return null;
  return {
    provider: value.provider,
    policy_number: value.policy_number,
    group_number: typeof value.group_number === "string" ? value.group_number : null,
  };
}

export function emptyProfile(): UserProfile {
  return {
    id: "",
    email: "",
    username: null,
    display_name: "",
    avatar_url: null,
    onboarding_status: "pending",
    onboarding_completed_at: null,
    created_at: "",
    full_name: "",
    phone: null,
    date_of_birth: null,
    gender: null,
    blood_type: null,
    height_cm: null,
    weight_kg: null,
    address: null,
    emergency_contacts: [],
      medical_info: {
        allergies: null,
        chronic_conditions: null,
        current_medications: null,
        notes: null,
        insurance: null,
      },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProfile(data: any): UserProfile {
  const fallback = emptyProfile();
  return {
    ...fallback,
    id: typeof data?.id === "string" ? data.id : fallback.id,
    email: typeof data?.email === "string" && data.email.trim() ? data.email : fallback.email,
    username: typeof data?.username === "string" ? data.username : null,
    display_name:
      typeof data?.display_name === "string" && data.display_name.trim()
        ? data.display_name
        : fallback.display_name,
    avatar_url: typeof data?.avatar_url === "string" ? data.avatar_url : null,
    onboarding_status: typeof data?.onboarding_status === "string" ? data.onboarding_status : "pending",
    onboarding_completed_at:
      typeof data?.onboarding_completed_at === "string" ? data.onboarding_completed_at : null,
    full_name:
      typeof data?.full_name === "string" && data.full_name.trim()
        ? data.full_name
        : typeof data?.display_name === "string" && data.display_name.trim()
          ? data.display_name
          : fallback.full_name,
    phone: typeof data?.phone === "string" ? data.phone : null,
    date_of_birth: typeof data?.date_of_birth === "string" ? data.date_of_birth : null,
    gender: data?.gender === "male" || data?.gender === "female" || data?.gender === "other" ? data.gender : null,
    blood_type: typeof data?.blood_type === "string" ? data.blood_type : null,
    height_cm: typeof data?.height_cm === "number" ? data.height_cm : null,
    weight_kg: typeof data?.weight_kg === "number" ? data.weight_kg : null,
    address: typeof data?.address === "string" ? data.address : null,
    emergency_contacts: Array.isArray(data?.emergency_contacts)
      ? data.emergency_contacts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((ec: any) => ec && typeof ec === "object")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((ec: any) => ({
            name: typeof ec.name === "string" ? ec.name : null,
            relationship: typeof ec.relationship === "string" ? ec.relationship : null,
            phone: typeof ec.phone === "string" ? ec.phone : null,
            email: typeof ec.email === "string" ? ec.email : undefined,
          }))
      : [],
    medical_info:
      data?.medical_info && typeof data.medical_info === "object"
        ? {
            allergies:
              typeof data.medical_info.allergies === "string" ? data.medical_info.allergies : null,
            chronic_conditions:
              typeof data.medical_info.chronic_conditions === "string"
                ? data.medical_info.chronic_conditions
                : null,
            current_medications:
              typeof data.medical_info.current_medications === "string"
                ? data.medical_info.current_medications
                : null,
            notes: typeof data.medical_info.notes === "string" ? data.medical_info.notes : null,
            insurance: normalizeInsurance(data.medical_info.insurance),
          }
        : fallback.medical_info,
    created_at: typeof data?.created_at === "string" ? data.created_at : "",
  };
}
