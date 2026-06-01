import type {
  Appointment,
  AppointmentStatus,
  AppointmentVisitType,
  PrescriptionMedicine,
} from "@/types/api";

const VALID_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "booked",
  "scheduled",
  "upcoming",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);

const VALID_APPOINTMENT_VISIT_TYPES: ReadonlySet<AppointmentVisitType> = new Set([
  "in_person",
  "video",
]);

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function statusValue(value: unknown): AppointmentStatus {
  return VALID_APPOINTMENT_STATUSES.has(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : "upcoming";
}

function visitTypeValue(value: unknown): AppointmentVisitType {
  if (value === "in-person") return "in_person";
  return VALID_APPOINTMENT_VISIT_TYPES.has(value as AppointmentVisitType)
    ? (value as AppointmentVisitType)
    : "in_person";
}

function prescriptionMedicines(value: unknown): PrescriptionMedicine[] {
  return Array.isArray(value) ? (value as PrescriptionMedicine[]) : [];
}

export function normalizeAppointment(raw: unknown, fallback: string): Appointment | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const prescriptionRaw =
    item.prescription && typeof item.prescription === "object"
      ? (item.prescription as Record<string, unknown>)
      : null;

  return {
    id: stringValue(item.id) ?? "",
    date: stringValue(item.appointment_date) ?? stringValue(item.date) ?? "",
    doctorName:
      stringValue(item.doctor_name) ?? stringValue(item.doctorName) ?? fallback,
    specialty: stringValue(item.specialty) ?? "N/A",
    clinic: stringValue(item.clinic) ?? "N/A",
    diagnosis: stringValue(item.diagnosis) ?? stringValue(item.reason) ?? fallback,
    visitType: visitTypeValue(item.visit_type ?? item.visitType),
    videoJoinUrl: stringValue(item.video_join_url) ?? stringValue(item.videoJoinUrl),
    status: statusValue(item.status),
    hasPrescription: Boolean(item.has_prescription ?? item.hasPrescription),
    prescription: prescriptionRaw
      ? {
          id: stringValue(prescriptionRaw.id) ?? "",
          issuedAt:
            stringValue(prescriptionRaw.issued_at) ??
            stringValue(prescriptionRaw.issuedAt) ??
            "",
          doctor: stringValue(prescriptionRaw.doctor) ?? fallback,
          clinic: stringValue(prescriptionRaw.clinic) ?? fallback,
          diagnosis: stringValue(prescriptionRaw.diagnosis) ?? fallback,
          medicines: prescriptionMedicines(prescriptionRaw.medicines),
          notes:
            typeof prescriptionRaw.notes === "string"
              ? prescriptionRaw.notes
              : null,
        }
      : null,
    notes: typeof item.notes === "string" ? item.notes : undefined,
  };
}
