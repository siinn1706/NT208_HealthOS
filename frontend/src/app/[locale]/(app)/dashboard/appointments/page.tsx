import { Stethoscope, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppointmentHistoryTable } from "@/components/dashboard/appointments/AppointmentHistoryTable";
import { AppointmentsPageClient } from "@/components/dashboard/appointments/AppointmentsPageClient";
import { headers } from "next/headers";
import type { Appointment } from "@/types/api";

async function fetchAppointments(): Promise<Appointment[]> {
  const t = await getTranslations("dashboard.appointments");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const noInfo = t("noData");
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/appointments?page=1&limit=50`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (Array.isArray(data)) {
        return data.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any): Appointment => ({
            id: typeof item?.id === "string" ? item.id : "",
            date: typeof item?.appointment_date === "string" ? item.appointment_date : "",
            doctorName:
              typeof item?.doctor_name === "string" && item.doctor_name.trim()
                ? item.doctor_name
                : noInfo,
            specialty:
              typeof item?.specialty === "string" && item.specialty.trim()
                ? item.specialty
                : "N/A",
            clinic:
              typeof item?.clinic === "string" && item.clinic.trim()
                ? item.clinic
                : "N/A",
            diagnosis:
              typeof item?.diagnosis === "string" && item.diagnosis.trim()
                ? item.diagnosis
                : noInfo,
            status:
              item?.status === "completed" ||
              item?.status === "upcoming" ||
              item?.status === "cancelled"
                ? item.status
                : "upcoming",
            hasPrescription: Boolean(item?.has_prescription),
            prescription:
              item?.prescription && typeof item.prescription === "object"
                ? {
                    id: typeof item.prescription.id === "string" ? item.prescription.id : "",
                    issuedAt:
                      typeof item.prescription.issued_at === "string"
                        ? item.prescription.issued_at
                        : "",
                    doctor:
                      typeof item.prescription.doctor === "string"
                        ? item.prescription.doctor
                        : noInfo,
                    clinic:
                      typeof item.prescription.clinic === "string"
                        ? item.prescription.clinic
                        : noInfo,
                    diagnosis:
                      typeof item.prescription.diagnosis === "string"
                        ? item.prescription.diagnosis
                        : noInfo,
                    medicines: Array.isArray(item.prescription.medicines)
                      ? item.prescription.medicines
                      : [],
                    notes:
                      typeof item.prescription.notes === "string"
                        ? item.prescription.notes
                        : null,
                  }
                : null,
            notes: typeof item?.notes === "string" ? item.notes : undefined,
          })
        );
      }
    }
  } catch {}
  return [];
}

export default async function AppointmentsPage() {
  const appointments = await fetchAppointments();

  return (
    <AppointmentsPageClient appointments={appointments} />
  );
}
