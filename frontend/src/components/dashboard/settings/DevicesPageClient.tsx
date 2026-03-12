"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DeviceConnectionCard, type Device } from "./DeviceConnectionCard";

// BFF TODO: GET /api/v1/devices/status
// Trigger: initial load (passed as prop from server component)
// Fallback: MOCK_DEVICES below

const MOCK_DEVICES: Device[] = [
  {
    id: "dev-001",
    provider: "apple_health",
    name: "Apple Health",
    model: "iPhone 15 Pro",
    connected: true,
    lastSync: new Date(Date.now() - 20 * 60_000).toISOString(),
    batteryPct: null,
  },
  {
    id: "dev-002",
    provider: "garmin",
    name: "Garmin Connect",
    model: "Forerunner 255",
    connected: true,
    lastSync: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    batteryPct: 73,
  },
  {
    id: "dev-003",
    provider: "oura",
    name: "Oura Ring",
    model: "Gen 3",
    connected: false,
    lastSync: null,
    batteryPct: null,
  },
  {
    id: "dev-004",
    provider: "withings",
    name: "Withings",
    model: "ScanWatch 2",
    connected: false,
    lastSync: null,
    batteryPct: null,
  },
];

const SUPPORTED_PROVIDERS: Array<{ provider: Device["provider"]; label: string }> = [
  { provider: "google_fit", label: "Google Fit" },
  { provider: "fitbit", label: "Fitbit" },
];

interface DevicesPageClientProps {
  initialDevices?: Device[];
}

export function DevicesPageClient({ initialDevices = MOCK_DEVICES }: DevicesPageClientProps) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);

  const handleSync = async (id: string) => {
    // BFF TODO: POST /api/v1/devices/:id/sync
    await new Promise((r) => setTimeout(r, 1500));
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, lastSync: new Date().toISOString() } : d
      )
    );
  };

  const handleDisconnect = (id: string) => {
    // BFF TODO: DELETE /api/v1/devices/:id
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, connected: false, lastSync: null } : d))
    );
  };

  const connected = devices.filter((d) => d.connected);
  const disconnected = devices.filter((d) => !d.connected);

  return (
    <div className="space-y-6">
      {/* Connected devices */}
      {connected.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Đang kết nối ({connected.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connected.map((device) => (
              <DeviceConnectionCard
                key={device.id}
                device={device}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available to connect */}
      {disconnected.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Có thể kết nối ({disconnected.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {disconnected.map((device) => (
              <DeviceConnectionCard
                key={device.id}
                device={device}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </section>
      )}

      {/* More providers */}
      {SUPPORTED_PROVIDERS.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Nền tảng khác
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUPPORTED_PROVIDERS.map(({ provider, label }) => (
              <button
                key={provider}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left"
                aria-label={`Thêm ${label}`}
                // BFF TODO: GET /api/v1/devices/:provider/auth-url
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Nhấn để kết nối</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Privacy note */}
      <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
        Dữ liệu từ thiết bị đeo được mã hóa và chỉ dùng để cải thiện trải nghiệm sức khỏe của bạn.
        Bạn có thể ngắt kết nối bất cứ lúc nào. Xem{" "}
        <a href="/vi/about" className="underline underline-offset-2 hover:text-foreground transition-colors">
          chính sách bảo mật
        </a>
        .
      </p>
    </div>
  );
}
