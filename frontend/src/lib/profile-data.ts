import { headers } from "next/headers";
import type { UserProfile, UserProfileUpdate } from "@/types/api";
import { emptyProfile, normalizeProfile } from "@/lib/user-profile-normalize";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export { emptyProfile, normalizeProfile };

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
    const errorJson = await res.json().catch(() => null);
    const message = errorJson?.error?.message ?? errorJson?.detail ?? `Save failed (${res.status})`;
    throw new Error(message);
  }
  const json = await res.json().catch(() => null);
  return normalizeProfile(json?.data);
}
