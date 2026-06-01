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
  title: {
    default: "HealthOS — Your Virtual Personal Doctor",
    template: "%s · HealthOS",
  },
  description:
    "HealthOS — track vitals, meals, reminders, and reports with your AI-powered personal health companion.",
  applicationName: "HealthOS",
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
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
