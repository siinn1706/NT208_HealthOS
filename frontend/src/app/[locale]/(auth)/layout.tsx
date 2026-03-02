import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "vi" | "en")) {
    notFound();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      {children}
    </main>
  );
}
