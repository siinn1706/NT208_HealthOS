"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_GROUPS } from "./nav-config";
import { track } from "@/lib/analytics";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_ACTIONS = [
  { key: "logMeal", href: "/dashboard/meals/add" },
  { key: "scanMeal", href: "/dashboard/meals/snap" },
  { key: "addVital", href: "/dashboard/health" },
  { key: "viewReports", href: "/dashboard/reports" },
] as const;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const t = useTranslations("dashboard.nav");
  const tGroups = useTranslations("dashboard.nav.groups");
  const tShell = useTranslations("dashboard.shell");
  const tQuick = useTranslations("dashboard.quickActions");
  const router = useRouter();
  const locale = useLocale();

  const go = React.useCallback(
    (href: string) => {
      track("shell.command_palette.opened", { href });
      onOpenChange(false);
      router.push(href as never);
    },
    [router, onOpenChange],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tShell("commandPaletteTitle")}
      description={tShell("commandPaletteHint")}
    >
      <CommandInput placeholder={tShell("commandPalettePlaceholder")} />
      <CommandList>
        <CommandEmpty>{tShell("commandPaletteEmpty")}</CommandEmpty>
        <CommandGroup heading={tShell("commandPaletteQuickActions")}>
          {QUICK_ACTIONS.map((q) => (
            <CommandItem
              key={q.key}
              value={`${tQuick(q.key as Parameters<typeof tQuick>[0])} ${q.href}`}
              onSelect={() => go(q.href)}
            >
              {tQuick(q.key as Parameters<typeof tQuick>[0])}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {NAV_GROUPS.map((group) => (
          <CommandGroup
            key={group.key}
            heading={tGroups(group.key as Parameters<typeof tGroups>[0])}
          >
            {group.links.map((link) => {
              const label = t(link.key as Parameters<typeof t>[0]);
              return (
                <CommandItem
                  key={link.key}
                  value={`${label} ${link.href}`}
                  disabled={link.comingSoon}
                  onSelect={() => go(link.href)}
                >
                  <link.icon className="size-4" aria-hidden="true" />
                  <span>{label}</span>
                  {link.comingSoon && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                      {tShell("commandPaletteComingSoon")}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center justify-between border-t px-3 py-2 text-[10px] text-muted-foreground">
        <span>{tShell("commandPaletteShortcut")}</span>
        <span className="uppercase">{locale}</span>
      </div>
    </CommandDialog>
  );
}
