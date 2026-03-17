import { headers } from "next/headers";
import type { UserProfile, UserProfileUpdate } from "@/types/api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function emptyProfile(): UserProfile {
  return {
    id: "",
    email: "N/A",
    display_name: "Chưa có thông tin",
    full_name: "Chưa có thông tin",
    phone: null,
    date_of_birth: null,
    gender: null,
    blood_type: null,
    height_cm: null,
    weight_kg: null,
    avatar_url: null,
    address: null,
    emergency_contacts: [],
    medical_info: {
      allergies: null,
      chronic_conditions: null,
      current_medications: null,
      notes: null,
    },
    created_at: "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProfile(data: any): UserProfile {
  const fallback = emptyProfile();
  return {
    ...fallback,
    id: typeof data?.id === "string" ? data.id : fallback.id,
    email: typeof data?.email === "string" && data.email.trim() ? data.email : fallback.email,
    display_name:
      typeof data?.display_name === "string" && data.display_name.trim()
        ? data.display_name
        : fallback.display_name,
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
    avatar_url: typeof data?.avatar_url === "string" ? data.avatar_url : null,
    address: typeof data?.address === "string" ? data.address : null,
    emergency_contacts: Array.isArray(data?.emergency_contacts) ? data.emergency_contacts : [],
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
          }
        : fallback.medical_info,
    created_at: typeof data?.created_at === "string" ? data.created_at : "",
  };
}

export async function getProfileData(): Promise<UserProfile> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${APP_URL}/api/v1/users/me`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return emptyProfile();
    const json = await res.json().catch(() => null);
    return normalizeProfile(json?.data);
  } catch {
    return emptyProfile();
  }
}

export async function updateProfileData(update: UserProfileUpdate): Promise<UserProfile> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${APP_URL}/api/v1/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: reqHeaders.get("cookie") ?? "",
      },
      body: JSON.stringify(update),
      cache: "no-store",
    });
    if (!res.ok) {
      return getProfileData();
    }
    const json = await res.json().catch(() => null);
    return normalizeProfile(json?.data);
  } catch {
    return getProfileData();
  }
}

