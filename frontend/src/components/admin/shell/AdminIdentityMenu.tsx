"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AdminIdentityMenuProps {
  displayName: string | null;
  avatarUrl: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function handleSignOut(): void {
  const redirectTimer = setTimeout(() => { window.location.href = "/"; }, 2000);
  fetch("/api/v1/auth/session", { method: "DELETE", credentials: "same-origin" })
    .then(() => { clearTimeout(redirectTimer); window.location.href = "/"; })
    .catch(() => { /* safety-net timer fires */ });
}

export function AdminIdentityMenu({ displayName, avatarUrl }: AdminIdentityMenuProps) {
  const initials = getInitials(displayName);
  const label = displayName ?? "Admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none motion-safe:transition-colors motion-safe:duration-150 hover:bg-[var(--admin-surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
        aria-label={`Account menu for ${label}`}
      >
        <Avatar size="sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={label} />}
          <AvatarFallback className="bg-[var(--admin-brand-soft)] text-[var(--admin-brand)] text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-[var(--admin-fg)] sm:block">
          {label}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold leading-tight">{label}</span>
            <span className="text-xs text-muted-foreground">Administrator</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={(e) => { e.preventDefault(); handleSignOut(); }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
