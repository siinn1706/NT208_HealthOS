"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

/** Shape of the goal object returned by Core BE (wrapped in { data: ... }) */
export interface SavedGoal {
  id: string;
  target_weight_kg: number | null;
  deadline: string | null;
}

export type SaveGoalResult =
  | { ok: true; goal: SavedGoal }
  | { ok: false; message: string };

/**
 * Server action: save (create or update) a health goal.
 *
 * Returns the saved goal on success so the caller can apply it to local state
 * directly — no revalidatePath / router.refresh guesswork needed.
 */
export async function saveHealthGoalAction(
  goalId: string | null,
  payload: {
    target_weight_kg: number | null;
    deadline: string | null;
  }
): Promise<SaveGoalResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return { ok: false, message: "Phiên đăng nhập hết hạn" };
  }

  const endpoint =
    goalId != null
      ? `${CORE_API_URL}/v1/health-goals/${goalId}`
      : `${CORE_API_URL}/v1/health-goals`;

  const method = goalId != null ? "PATCH" : "POST";

  try {
    const beRes = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!beRes.ok) {
      let msg = `Lỗi ${beRes.status}`;
      try {
        const errJson = await beRes.json();
        msg = (errJson as { message?: string }).message ?? msg;
      } catch {
        // use status-based message
      }
      return { ok: false, message: msg };
    }

    const beJson = await beRes.json() as { data?: SavedGoal };
    // Core BE wraps in { data: ... }
    const goal = beJson?.data ?? null;

    if (!goal) {
      return { ok: false, message: "Máy chủ không trả dữ liệu mục tiêu" };
    }

    return { ok: true, goal };
  } catch {
    return { ok: false, message: "Không thể kết nối máy chủ" };
  }
}
