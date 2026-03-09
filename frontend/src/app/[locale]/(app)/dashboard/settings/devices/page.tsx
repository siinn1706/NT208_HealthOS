import { Watch } from "lucide-react";
import { DevicesPageClient } from "@/components/dashboard/settings/DevicesPageClient";

// BFF TODO: GET /api/v1/devices/status
// Trigger: server-side page load
// Response: Device[]
// Fallback: DevicesPageClient handles MOCK_DEVICES internally

export default async function DevicesPage() {
  // Future: const devices = await fetchBFF("/api/v1/devices/status");
  // Pass as initialDevices prop to DevicesPageClient

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
      <DevicesPageClient />
    </div>
  );
}
