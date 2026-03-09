import { Stethoscope, Plus } from "lucide-react";
import { MOCK_APPOINTMENTS } from "@/data/appointments";
import { AppointmentHistoryTable } from "@/components/dashboard/appointments/AppointmentHistoryTable";
import type { Appointment } from "@/data/appointments";

// BFF TODO: GET /api/v1/appointments
// Trigger: server-side page load
// Request: { page: 1; limit: 50 }
// Response: PaginatedResponse<Appointment>
// Fallback: MOCK_APPOINTMENTS from @/data/appointments

async function fetchAppointments(): Promise<Appointment[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${appUrl}/api/v1/appointments?page=1&limit=50`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // BFF unavailable — fallback to mock
  }
  return MOCK_APPOINTMENTS;
}

export default async function AppointmentsPage() {
  const appointments = await fetchAppointments();

  const totalCompleted = appointments.filter((a) => a.status === "completed").length;
  const totalUpcoming = appointments.filter((a) => a.status === "upcoming").length;
  const totalWithRx = appointments.filter((a) => a.hasPrescription).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">Lịch sử khám bệnh</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Xem lịch sử khám và toa thuốc đã kê
          </p>
        </div>

        {/* Add appointment button (BFF TODO: POST /api/v1/appointments) */}
        <button
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          aria-label="Thêm lịch khám mới"
        >
          <Plus className="w-4 h-4" />
          Thêm lịch khám
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Đã khám",
            value: totalCompleted,
            color: "#4ADE80",
          },
          {
            label: "Sắp tới",
            value: totalUpcoming,
            color: "#41BCE6",
          },
          {
            label: "Có toa thuốc",
            value: totalWithRx,
            color: "#E7DEA7",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card px-4 py-3 text-center"
          >
            <p
              className="text-2xl font-bold"
              style={{ color }}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <AppointmentHistoryTable appointments={appointments} />

      {/* ── Disclaimer ── */}
      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">⚕️ Lưu ý:</span> Dữ liệu lịch sử khám bệnh chỉ mang tính chất tham khảo.
          Toa thuốc phải được sử dụng theo hướng dẫn của bác sĩ. Không tự ý thay đổi liều lượng hoặc dừng thuốc.
        </p>
      </div>
    </div>
  );
}
