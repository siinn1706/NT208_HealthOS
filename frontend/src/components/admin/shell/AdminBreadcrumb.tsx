"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { stripLocale } from "@/lib/admin/path-classify";
import { routing } from "@/i18n/routing";

const LABEL_MAP: Record<string, string> = {
  "/admin": "Overview",
  "/admin/users": "Users",
  "/admin/subscriptions": "Subscriptions",
  "/admin/audit": "Audit",
  "/admin/security": "Security",
  "/admin/forbidden": "Forbidden",
};

interface Crumb {
  label: string;
  href: string;
  isCurrent: boolean;
}

function buildCrumbs(path: string): Crumb[] {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let accumulated = "";

  for (let i = 0; i < parts.length; i++) {
    accumulated += "/" + parts[i];
    const isLast = i === parts.length - 1;
    const mapped = LABEL_MAP[accumulated];
    const label = mapped ?? truncateId(parts[i]);

    // Skip "admin" root segment if it maps to Overview
    if (accumulated === "/admin" && !isLast) {
      crumbs.push({ label: "Overview", href: "/admin", isCurrent: false });
      continue;
    }

    crumbs.push({ label, href: accumulated, isCurrent: isLast });
  }

  return crumbs;
}

function truncateId(segment: string): string {
  if (segment.length <= 8) return segment;
  return segment.slice(0, 6) + "…";
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const clean = stripLocale(pathname, routing.locales);
  const crumbs = buildCrumbs(clean);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.href}>
          {idx > 0 && (
            <ChevronRight
              className="size-3.5 shrink-0 text-[var(--admin-fg-subtle)]"
              aria-hidden="true"
            />
          )}
          {crumb.isCurrent ? (
            <span
              aria-current="page"
              className="font-medium text-[var(--admin-fg)] truncate max-w-[12rem]"
              title={crumb.label}
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[var(--admin-fg-muted)] hover:text-[var(--admin-fg)] motion-safe:transition-colors motion-safe:duration-150 truncate max-w-[12rem]"
              title={crumb.label}
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
