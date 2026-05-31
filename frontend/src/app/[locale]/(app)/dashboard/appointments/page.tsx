import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { AppointmentsPageClient } from "@/components/dashboard/appointments/AppointmentsPageClient";
import { normalizeAppointment } from "@/components/dashboard/appointments/appointment-normalizer";
import type { Appointment } from "@/types/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("appointments") };
}

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
        return data
          .map((item: unknown) => normalizeAppointment(item, noInfo))
          .filter((item): item is Appointment => item !== null);
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
