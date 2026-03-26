import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

// Default metadata — removed; locale-aware metadata defined in [locale]/layout.tsx

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // next-intl injects locale via middleware headers — read it for html[lang]
  const locale = await getLocale();

  return (
    <html lang={locale} className={beVietnamPro.variable}>
      <body className="overflow-x-hidden font-[family-name:var(--font-be-vietnam-pro)]">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
