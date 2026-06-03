import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HealthOS — AI Health Management App | NT208 University Project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, color: "#f8fafc", letterSpacing: "-2px" }}>
          HealthOS
        </div>
        <div style={{ fontSize: 30, color: "#94a3b8", textAlign: "center", maxWidth: 800 }}>
          AI-powered health management · NT208 University Project
        </div>
        <div style={{ fontSize: 20, color: "#64748b" }}>
          Calorie tracking · BMI · AI meal analysis · Reminders
        </div>
      </div>
    ),
    { ...size },
  );
}
