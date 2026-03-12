import { Watch } from "lucide-react";
import { DevicesPageClient } from "@/components/dashboard/settings/DevicesPageClient";

// BFF TODO: GET /api/v1/devices
// Trigger: server-side page load
// Response: { data: Device[] }
// Fallback: DevicesPageClient handles MOCK_DEVICES internally

async function fetchDevices() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${appUrl}/api/v1/devices`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data ?? [];
    }
  } catch {
    // BFF unavailable — DevicesPageClient will use mock
  }
  return undefined;
}

export default async function DevicesPage() {
  const initialDevices = await fetchDevices();

  return (
    <div className="max-w-[960px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-2">
          <Watch className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="text-xl font-bold text-foreground">Thiết bị kết nối</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quản lý wearable và thiết bị theo dõi sức khỏe của bạn
        </p>
      </div>

      {/* ── Client-driven device list ── */}
      <DevicesPageClient initialDevices={initialDevices} />
    </div>
  );
}
