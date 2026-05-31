"use client";

import { useRef, useState } from "react";
import { Camera, Pencil, X, Check, CalendarDays } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/types/api";
import { getLocaleTag } from "@/lib/format-utils";

interface ProfileHeaderProps {
  profile: UserProfile;
  isEditing: boolean;
  isSaving: boolean;
  avatarPreview: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onAvatarChange: (file: File) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatMemberSince(isoDate: string, locale: string): string {
  return new Date(isoDate).toLocaleDateString(getLocaleTag(locale), {
    month: "long",
    year: "numeric",
  });
}

export function ProfileHeader({
  profile,
  isEditing,
  isSaving,
  avatarPreview,
  onEdit,
  onCancel,
  onSave,
  onAvatarChange,
}: ProfileHeaderProps) {
  const t = useTranslations("dashboard.profile");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onAvatarChange(file);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="size-20 ring-2 ring-primary/20">
              <AvatarImage
                src={avatarPreview ?? profile.avatar_url ?? undefined}
                alt={profile.full_name}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>

            {/* Camera overlay — only in edit mode */}
            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) onAvatarChange(file);
                }}
                className={`absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 transition-opacity ${
                  isDragOver ? "opacity-100" : "opacity-0 hover:opacity-100"
                }`}
                aria-label={t("avatarChange")}
              >
                <Camera className="size-5 text-white" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              aria-label={t("avatarChange")}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name + email + badge */}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-foreground">
              {profile.full_name}
            </h2>
            <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <CalendarDays className="size-3 text-muted-foreground" />
              <Badge variant="secondary" className="h-5 text-xs font-normal px-1.5">
                {t("memberSince")} {formatMemberSince(profile.created_at, locale)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="gap-1.5"
            >
              <Pencil className="size-3.5" />
              {t("editButton")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                {t("cancelButton")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                <Check className="size-3.5" />
                {isSaving ? t("saving") : t("saveButton")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
