"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, ExternalLink, Ban, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserRowActionsProps {
  userId: string;
  displayName: string | null;
  email: string;
  status: string;
  isSelf: boolean;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
}

/** ⋮ row action menu — View / Ban / Unban / Copy ID. */
export function UserRowActions({
  userId,
  displayName,
  email,
  status,
  isSelf,
  onBan,
  onUnban,
}: UserRowActionsProps) {
  const isBanned = status === "banned";
  const canBan = !isBanned && !isSelf;
  const canUnban = isBanned;
  const label = displayName ?? email;

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(userId);
      toast.success("User ID copied to clipboard.");
    } catch {
      toast.error("Failed to copy user ID.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          aria-label={`Actions for ${label}`}
          className="size-7 p-0 text-[var(--admin-fg-muted)] hover:text-[var(--admin-fg)]"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link
            href={`/admin/users/${userId}`}
            className="flex cursor-pointer items-center gap-2"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View detail
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={handleCopyId}
          className="flex cursor-pointer items-center gap-2"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          Copy user ID
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={!canBan}
          onSelect={() => canBan && onBan(userId)}
          className="flex cursor-pointer items-center gap-2 text-[var(--admin-status-danger)] focus:text-[var(--admin-status-danger)]"
          title={isSelf ? "Cannot ban your own account" : isBanned ? "Already banned" : undefined}
        >
          <Ban className="size-3.5" aria-hidden="true" />
          Ban user
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={!canUnban}
          onSelect={() => canUnban && onUnban(userId)}
          className="flex cursor-pointer items-center gap-2 text-[var(--admin-status-success)] focus:text-[var(--admin-status-success)]"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Unban user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
