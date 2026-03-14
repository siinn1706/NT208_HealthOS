/**
 * Profile server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * They call the BFF /api/v1/* endpoints first, then fall back to mock data on error.
 */

import { headers } from "next/headers";
import type { UserProfile, UserProfileUpdate } from "@/types/api";

// ---------------------------------------------------------------------------
// Mock data for fallback
// ---------------------------------------------------------------------------

const MOCK_USER_PROFILE: UserProfile = {
  id: "user-1",
  email: "admin@healthos.com",
  display_name: "Nguyễn Văn A",
  full_name: "Nguyễn Văn A",
  phone: "+84 123 456 789",
  date_of_birth: "1995-06-15",
  gender: "male",
  blood_type: "A",
  height_cm: 172,
  weight_kg: 72,
  avatar_url: null,
  address: "123 Đường Nguyễn Trãi, Phường 5, Quận 1, TP. Hồ Chí Minh",
  emergency_contacts: [
    {
      name: "Nguyễn Thị B",
      relationship: "spouse",
      phone: "+84 987 654 321",
    },
  ],
  medical_info: {
    allergies: "Penicillin",
    chronic_conditions: null,
    current_medications: null,
    notes: null,
  },
  created_at: "2025-01-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Data access helpers
// ---------------------------------------------------------------------------

export async function getProfileData(): Promise<UserProfile> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/users/me`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      console.warn("[profile-data] Failed to fetch profile, using mock data");
      return MOCK_USER_PROFILE;
    }
    const json = await res.json();
    const data = json?.data;
    if (!data) {
      console.warn("[profile-data] Invalid response, using mock data");
      return MOCK_USER_PROFILE;
    }
    return data as UserProfile;
  } catch (error) {
    console.warn("[profile-data] Error fetching profile:", error);
    return MOCK_USER_PROFILE;
  }
}

export async function updateProfileData(
  update: UserProfileUpdate
): Promise<UserProfile> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/v1/users/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[profile-data] Failed to update profile, using mock data");
      return { ...MOCK_USER_PROFILE, ...update } as UserProfile;
    }
    const json = await res.json();
    const data = json?.data;
    if (!data) {
      console.warn("[profile-data] Invalid update response, using mock data");
      return { ...MOCK_USER_PROFILE, ...update } as UserProfile;
    }
    return data as UserProfile;
  } catch (error) {
    console.warn("[profile-data] Error updating profile:", error);
    return { ...MOCK_USER_PROFILE, ...update } as UserProfile;
  }
}
