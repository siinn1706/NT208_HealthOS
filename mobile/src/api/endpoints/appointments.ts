import { apiFetch } from "../client";

export type AppointmentStatus = "completed" | "upcoming" | "cancelled";

/**
 * Status transitions enforced by [appointments.py](backend/app/api/v1/endpoints/appointments.py)
 * `update_appointment_status()` via FSM. A 422 with code `INVALID_STATUS_TRANSITION`
 * indicates the requested target is not allowed from the current state.
 */
export type AppointmentStatusTarget = AppointmentStatus;

export interface Appointment {
  id: string;
  appointment_date: string;
  doctor_name: string;
  specialty?: string | null;
  clinic?: string | null;
  diagnosis?: string | null;
  status: AppointmentStatus;
  notes?: string | null;
  has_prescription?: boolean;
  prescription?: unknown;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface AppointmentCreate {
  appointment_date: string;
  doctor_name: string;
  specialty?: string;
  clinic?: string;
  reason?: string;
  notes?: string;
}

export async function listAppointments(opts: {
  page?: number;
  per_page?: number;
} = {}): Promise<{ data: Appointment[]; meta: PaginationMeta }> {
  return apiFetch<{ data: Appointment[]; meta: PaginationMeta }>(
    "/v1/appointments",
    { query: opts }
  );
}

export async function createAppointment(payload: AppointmentCreate): Promise<Appointment> {
  const res = await apiFetch<{ data: Appointment }>("/v1/appointments", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatusTarget
): Promise<Appointment> {
  const res = await apiFetch<{ data: Appointment }>(
    `/v1/appointments/${appointmentId}/status`,
    { method: "PATCH", body: { status } }
  );
  return res.data;
}
