// Locale-aware navigation helpers generated from routing config.
// Use these instead of next/link and next/navigation in all components
// that contain internal links, so locale prefix is handled automatically.
import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
