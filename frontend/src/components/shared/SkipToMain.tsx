import { getTranslations } from "next-intl/server";

/**
 * Visually hidden skip link that becomes visible on keyboard focus,
 * so screen-reader and keyboard users can jump past chrome (Navbar /
 * Sidebar) straight into the page's main content.
 *
 * Pair with `<main id="main">` in the surrounding layout.
 */
export async function SkipToMain() {
  const t = await getTranslations("dashboard.shell");
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-background focus:p-2 focus:text-foreground focus:ring-2 focus:ring-ring"
    >
      {t("skipToMain")}
    </a>
  );
}
