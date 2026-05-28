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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPickerMulti } from "./UserPickerMulti";
import type { ChatParticipant, Conversation } from "@/types/api";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, memberIds: string[], avatarUrl?: string) => Promise<Conversation | null>;
  onSuccess?: (conv: Conversation) => void;
}

export function CreateGroupDialog({ open, onOpenChange, onCreate, onSuccess }: CreateGroupDialogProps) {
  const t = useTranslations("chat.group");
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<ChatParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const validate = (): string | null => {
    if (title.length < 2) return t("errorGroupTitleTooShort");
    if (title.length > 100) return t("errorGroupTitleTooLong");
    if (members.length < 2) return t("errorGroupTooSmall");
    if (members.length > 50) return t("errorGroupTooLarge");
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setIsCreating(true);
    try {
      const conv = await onCreate(title.trim(), members.map((m) => m.user_id));
      if (conv) {
        onSuccess?.(conv);
        onOpenChange(false);
        setTitle("");
        setMembers([]);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    onOpenChange(false);
    setTitle("");
    setMembers([]);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Group name */}
          <div className="space-y-1.5">
            <Label htmlFor="group-title">{t("groupTitle")}</Label>
            <Input
              id="group-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("groupTitlePlaceholder")}
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Member picker */}
          <div className="space-y-1.5">
            <Label>
              {t("members", { count: members.length })}
            </Label>
            <UserPickerMulti selected={members} onChange={setMembers} max={50} />
            <p className="text-xs text-muted-foreground">{t("membersHint")}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            {t("cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "…" : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
