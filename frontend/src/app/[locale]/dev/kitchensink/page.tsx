import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitchensinkClient } from "./KitchensinkClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HealthOS · Kitchensink (dev only)",
  robots: { index: false, follow: false },
};

/**
 * Dev-only primitive preview page. Renders every shared UI primitive in its
 * common variants so we can:
 *   - axe + visually verify them in one place
 *   - confirm i18n parity by switching browser locale (`/vi/dev/kitchensink`)
 *   - catch unintentional regressions when refactoring shared components
 *
 * Disabled in production builds (404).
 */
export default function KitchensinkPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <KitchensinkClient />;
}
