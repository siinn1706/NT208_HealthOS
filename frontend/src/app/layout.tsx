import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Script from "next/script";
import { Be_Vietnam_Pro } from "next/font/google";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { OfflineProvider } from "@/components/providers/offline-provider";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const accentEarlyScript = readFileSync(join(process.cwd(), "public", "accent-early.js"), "utf8");

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://healthos.vn"),
  title: {
    default: "HealthOS — Ứng dụng quản lý sức khỏe | NT208 Project",
    template: "%s · HealthOS",
  },
  description:
    "HealthOS là đồ án môn học NT208 — ứng dụng theo dõi BMI, calo, bữa ăn bằng AI, nhắc nhở thuốc và quản lý sức khỏe cá nhân.",
  applicationName: "HealthOS",
  keywords: [
    "HealthOS", "NT208", "đồ án môn học", "health management app",
    "calorie tracking", "AI food recognition", "BMI tracking",
    "nutrition assistant", "fitness tracking", "university project Vietnam",
  ],
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
  },
  openGraph: {
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // next-intl injects locale via middleware headers — read it for html[lang]
  const locale = await getLocale();

  return (
    <html lang={locale} className={beVietnamPro.variable} suppressHydrationWarning>
      <body className="overflow-x-hidden font-[family-name:var(--font-be-vietnam-pro)]">
        {process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_ENABLE_REACT_GRAB === "1" && (
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
          )}
        {/* Keep this out of the hydrated head so extension-injected head scripts cannot displace it. */}
        <script
          id="healthos-accent-early"
          dangerouslySetInnerHTML={{ __html: accentEarlyScript }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <OfflineProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </OfflineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
