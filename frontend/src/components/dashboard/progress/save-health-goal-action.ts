"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { CORE_API_URL } from "@/lib/env";
import {
  extractHealthGoalErrorMessage,
  type SaveGoalResult,
  type SavedGoal,
} from "./health-goal-action-contract";

async function requireAuth(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

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
  const token = await requireAuth();

  if (!token) {
    return { ok: false, message: "Session expired" };
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
      let msg = `Error ${beRes.status}`;
      try {
        const errJson = await beRes.json();
        msg = extractHealthGoalErrorMessage(errJson, msg);
      } catch {
        // use status-based message
      }
      return { ok: false, message: msg };
    }

    const beJson = await beRes.json() as { data?: SavedGoal };
    // Core BE wraps in { data: ... }
    const goal = beJson?.data ?? null;

    if (!goal) {
      return { ok: false, message: "Server returned no goal data" };
    }

    return { ok: true, goal };
  } catch {
    return { ok: false, message: "Cannot connect to server" };
  }
}
