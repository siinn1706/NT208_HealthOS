"use client";

import * as React from "react";
import { Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ColumnDef {
  key: string;
  label: string;
  /** Whether this column can be hidden. Defaults to true. */
  hideable?: boolean;
}

interface ColumnVisibilityMenuProps {
  columns: ColumnDef[];
  visible: Set<string>;
  onChange: (visible: Set<string>) => void;
}

/** Dropdown checkbox list for toggling column visibility. */
export function ColumnVisibilityMenu({ columns, visible, onChange }: ColumnVisibilityMenuProps) {
  function toggle(key: string) {
    const next = new Set(visible);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Toggle column visibility"
          className="gap-1.5"
        >
          <Columns className="size-3.5" aria-hidden="true" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-medium text-[var(--admin-fg-muted)]">
          Toggle columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => {
          if (col.hideable === false) return null;
          return (
            <DropdownMenuCheckboxItem
              key={col.key}
              checked={visible.has(col.key)}
              onCheckedChange={() => toggle(col.key)}
              className="text-sm"
            >
              {col.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
