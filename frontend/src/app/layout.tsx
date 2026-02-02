import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthOS",
  description: "Hệ thống bác sĩ cá nhân ảo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
