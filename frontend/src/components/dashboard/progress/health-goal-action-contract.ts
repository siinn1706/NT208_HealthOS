/** Shape of the goal object returned by Core BE (wrapped in { data: ... }) */
export interface SavedGoal {
  id: string;
  target_weight_kg: number | null;
  deadline: string | null;
}

export type SaveGoalResult =
  | { ok: true; goal: SavedGoal }
  | { ok: false; message: string };

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function extractHealthGoalErrorMessage(payload: unknown, fallback: string): string {
  if (payload == null || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const directMessage = readString(record.message);
  if (directMessage != null) return directMessage;

  const error = record.error;
  if (error != null && typeof error === "object") {
    const nestedMessage = readString((error as Record<string, unknown>).message);
    if (nestedMessage != null) return nestedMessage;
  }

  const detail = record.detail;
  const detailMessage = readString(detail);
  if (detailMessage != null) return detailMessage;

  if (Array.isArray(detail)) {
    for (const item of detail) {
      if (item != null && typeof item === "object") {
        const itemMessage = readString((item as Record<string, unknown>).msg);
        if (itemMessage != null) return itemMessage;
      }
    }
  }

  return fallback;
}
