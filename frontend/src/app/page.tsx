import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HealthOS",
  description: "Virtual personal doctor and health management platform.",
};

export default async function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
