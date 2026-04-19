import { apiFetch, unwrapData } from "../client";

export interface SecurityLogEntry {
  id: string;
  event_type: string;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export async function fetchSecurityLogs(opts: {
  limit?: number;
  offset?: number;
  event_type?: string;
} = {}): Promise<SecurityLogEntry[]> {
  const res = await apiFetch<{ data: SecurityLogEntry[] }>(
    "/v1/security-logs/",
    { query: opts }
  );
  return unwrapData(res);
}
