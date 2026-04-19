"use client";

import { useTranslations } from "next-intl";
import {
  MessageCircle,
  Pin,
  Image as ImageIcon,
  Search,
  ShieldOff,
  Inbox,
} from "lucide-react";
import { EmptyState } from "@/components/shared/state/EmptyState";

/**
 * Variants supported by the chat empty surface. Keeping these enumerated
 * (rather than letting callers free-form a title/description) ensures every
 * empty path renders consistent copy + icon + tone, and makes the surface
 * easy to localise.
 */
export type ChatEmptyKind =
  | "no-conversation-selected"
  | "no-conversations"
  | "empty-pinned"
  | "empty-media"
  | "no-search-results"
  | "blocked";

interface ChatEmptyStateProps {
  kind?: ChatEmptyKind;
  /** Optional callback wired to the primary action (e.g., "Start a new chat"). */
  onPrimaryAction?: () => void;
  /** Density: `route` for the full chat pane, `section` for inline panels. */
  density?: "route" | "section";
}

/**
 * Single source of truth for the chat surface's "nothing here" states.
 * Defaults to the legacy "no conversation selected" variant so existing call
 * sites (`<ChatEmptyState />`) keep working unchanged.
 */
export function ChatEmptyState({
  kind = "no-conversation-selected",
  onPrimaryAction,
  density = "section",
}: ChatEmptyStateProps) {
  const t = useTranslations("chat.empty");
  const tChat = useTranslations("chat");

  switch (kind) {
    case "no-conversation-selected":
      return (
        <EmptyState
          kind="empty-first-use"
          density={density}
          icon={<MessageCircle className="size-6" aria-hidden />}
          title={tChat("title")}
          description={tChat("noConversation")}
        />
      );

    case "no-conversations":
      return (
        <EmptyState
          kind="empty-first-use"
          density={density}
          icon={<Inbox className="size-6" aria-hidden />}
          title={t("noConversationsTitle")}
          description={t("noConversationsDescription")}
          primaryAction={
            onPrimaryAction
              ? { label: t("startNewChat"), onClick: onPrimaryAction }
              : undefined
          }
        />
      );

    case "empty-pinned":
      return (
        <EmptyState
          kind="empty-no-data-in-range"
          density={density}
          icon={<Pin className="size-6" aria-hidden />}
          title={t("noPinnedTitle")}
          description={t("noPinnedDescription")}
        />
      );

    case "empty-media":
      return (
        <EmptyState
          kind="empty-no-data-in-range"
          density={density}
          icon={<ImageIcon className="size-6" aria-hidden />}
          title={t("noMediaTitle")}
          description={t("noMediaDescription")}
        />
      );

    case "no-search-results":
      return (
        <EmptyState
          kind="empty-no-results"
          density={density}
          icon={<Search className="size-6" aria-hidden />}
          title={t("noSearchResultsTitle")}
          description={t("noSearchResultsDescription")}
        />
      );

    case "blocked":
      return (
        <EmptyState
          kind="empty-first-use"
          density={density}
          icon={<ShieldOff className="size-6" aria-hidden />}
          title={t("blockedTitle")}
          description={t("blockedDescription")}
        />
      );
  }
}
