import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Guardrail: prevent regressions of the "/vi/vi/onboarding" double-locale
  // bug (see plans/post-login-double-locale-redirect/plan.md). next-intl's
  // `useRouter`/`usePathname`/`Link` from `@/navigation` are locale-aware
  // (auto-prefix the active locale). Mixing them with the raw versions from
  // `next/navigation` (which return paths WITH the locale prefix and don't
  // re-prefix on push) silently produces double-prefixed URLs that 404.
  // `useSearchParams`, `notFound`, and `redirect` are still allowed because
  // they have no equivalent in `@/navigation` or are intentionally raw.
  {
    name: "next-intl/no-raw-router-or-pathname",
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/navigation",
              importNames: ["useRouter", "usePathname", "Link"],
              message:
                "Import `useRouter` / `usePathname` / `Link` from `@/navigation` (next-intl) inside locale-aware pages so the locale prefix stays consistent. Mixing with `next/navigation` causes /vi/vi/... double-prefix bugs.",
            },
          ],
        },
      ],
    },
  },
  // The src/navigation.ts module re-exports next-intl helpers, so it must
  // still be allowed to import (not from next/navigation, but useful safety).
]);

export default eslintConfig;
