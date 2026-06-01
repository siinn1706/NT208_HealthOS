import type { ConcernCategory } from '../../types/api';

export const STANDALONE_SYMPTOM_TARGET = 'standalone';

export const SYMPTOM_OPTIONS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea',
  'Chest pain', 'Shortness of breath', 'Dizziness', 'Sore throat', 'Back pain',
];

export interface SymptomAppointmentOption {
  id: string;
  appointment_date: string;
  doctor_name?: string | null;
  specialty?: string | null;
  clinic?: string | null;
  status?: string | null;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function inferConcernCategory(symptom: string): ConcernCategory {
  const value = symptom.toLowerCase();
  if (value.includes('fever')) return 'fever';
  if (value.includes('cough') || value.includes('shortness of breath') || value.includes('sore throat')) return 'resp';
  if (value.includes('pain') || value.includes('headache') || value.includes('back')) return 'pain';
  if (value.includes('fatigue') || value.includes('dizziness')) return 'mental';
  return 'other';
}

export function upcomingSymptomAppointments(
  appointments: SymptomAppointmentOption[] | null | undefined,
  nowMs = Date.now(),
): SymptomAppointmentOption[] {
  const floor = nowMs - 24 * 60 * 60 * 1000;
  return [...(appointments ?? [])]
    .filter((appointment) => {
      if (!appointment.id || !appointment.appointment_date) return false;
      if (appointment.status === 'cancelled') return false;
      const ts = new Date(appointment.appointment_date).getTime();
      return !Number.isNaN(ts) && ts >= floor;
    })
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
}

export function formatSymptomAppointmentLabel(appointment?: SymptomAppointmentOption | null): string {
  if (!appointment) return 'selected appointment';
  return appointment.doctor_name || appointment.specialty || appointment.clinic || 'Appointment';
}

export function formatSymptomAppointmentMeta(appointment: SymptomAppointmentOption): string {
  const date = new Date(appointment.appointment_date);
  const dateLabel = Number.isNaN(date.getTime())
    ? appointment.appointment_date
    : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const care = [appointment.specialty, appointment.clinic].filter(Boolean).join(' - ');
  return care ? `${care} - ${dateLabel}` : dateLabel;
}
