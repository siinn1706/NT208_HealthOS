import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
