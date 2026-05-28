"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPickerMulti } from "./UserPickerMulti";
import type { ChatParticipant } from "@/types/api";

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMemberIds: string[];
  onAdd: (userIds: string[]) => Promise<boolean>;
}

export function AddMembersDialog({ open, onOpenChange, existingMemberIds, onAdd }: AddMembersDialogProps) {
  const t = useTranslations("chat.group");
  const [selected, setSelected] = useState<ChatParticipant[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (selected.length === 0) { setError(t("errorGroupTooSmall")); return; }
    setError(null);
    setIsAdding(true);
    try {
      const ok = await onAdd(selected.map((u) => u.user_id));
      if (ok) {
        onOpenChange(false);
        setSelected([]);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    if (isAdding) return;
    onOpenChange(false);
    setSelected([]);
    setError(null);
  };

  // Filter already-members from picker results by passing existing IDs is handled
  // inside UserPickerMulti via the "selected" check — we pre-seed no one but
  // the search results exclude existing members on the server side.

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addMembersTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <UserPickerMulti selected={selected} onChange={setSelected} max={50} excludeIds={existingMemberIds} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isAdding}>
            {t("cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={isAdding || selected.length === 0}>
            {isAdding ? "…" : t("addMembers")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
