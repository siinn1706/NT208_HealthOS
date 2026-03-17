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

// Default metadata — overridden per locale in [locale]/layout
export const metadata: Metadata = {
  title: {
    default: "HealthOS | Bác sĩ cá nhân ảo của bạn",
    template: "%s | HealthOS",
  },
  description:
    "HealthOS — hệ thống bác sĩ cá nhân ảo: quản lý hồ sơ y tế, nhật ký dinh dưỡng, phân tích bữa ăn AI, kết nối wearable và cảnh báo realtime.",
};

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
