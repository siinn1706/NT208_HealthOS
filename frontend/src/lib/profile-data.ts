/**
 * Profile server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * Uses mock data for MVP — TODO: replace with bffFetch to Core BE.
 */

import type { UserProfile, UserProfileUpdate } from "@/types/api";

// ---------------------------------------------------------------------------
// Mock data — replace with fetch() calls to BFF in V1
// ---------------------------------------------------------------------------

const MOCK_PROFILE: UserProfile = {
  id: "user-001",
  email: "nguyenvana@example.com",
  display_name: "Nguyễn Văn A",
  created_at: "2025-01-15T08:00:00Z",
  full_name: "Nguyễn Văn A",
  date_of_birth: "1995-03-15",
  gender: "male",
  blood_type: "O+",
  height_cm: 172,
  weight_kg: 68,
  phone: "0901234567",
  address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  avatar_url: null,
  emergency_contacts: [
    {
      id: "ec-001",
      name: "Nguyễn Văn B",
      relationship: "parent",
      phone: "0912345678",
    },
    {
      id: "ec-002",
      name: "Trần Thị C",
      relationship: "spouse",
      phone: "0987654321",
    },
  ],
  medical_info: {
    allergies: "Penicillin, tôm, cua",
    chronic_conditions: "Viêm mũi dị ứng",
    current_medications: "Loratadine 10mg (khi cần)",
    notes: "Dị ứng nhẹ với bụi mấu. Đã tiêm đủ vaccine COVID-19.",
  },
};

export async function getProfileData(): Promise<UserProfile> {
  // TODO: Replace with BFF call:
  // const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/me`, {
  //   next: { revalidate: 60 },
  //   headers: { Cookie: cookies().toString() },
  // });
  // const { data } = await res.json();
  // return data;
  return MOCK_PROFILE;
}

export async function updateProfileData(
  update: UserProfileUpdate
): Promise<UserProfile> {
  // TODO: Replace with BFF call:
  // const res = await bffFetch("/api/v1/users/me", { method: "PATCH", body: update });
  // return res.data;

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { ...MOCK_PROFILE, ...update };
}
