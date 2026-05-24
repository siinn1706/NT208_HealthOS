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
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {/* Full 5-token early hydration lives in /accent-early.js (~2KB) — keeps layout HTML small. */}
        <script src="/accent-early.js" />
      </head>
      <body className="overflow-x-hidden font-[family-name:var(--font-be-vietnam-pro)]">
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
