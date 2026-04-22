import React, { useMemo } from "react";
import { RefreshControl, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useLocale, useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  acceptConversation,
  listConversations,
  listPendingConversations,
  rejectConversation,
} from "@/api/endpoints/conversations";
import { sessionStore } from "@/auth/session";
import { relative, type RelativeTimeLabels } from "@/utils/date";
import { getConversationListPreview, getConversationDisplayTitle } from "@/utils/chat-presentation";
import { ConversationListItem } from "@/components/chat/ConversationListItem";
import { PendingInviteSection } from "@/components/chat/PendingInviteSection";

export default function ChatListScreen() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, spacing } = useTheme();
  const meId = sessionStore((s) => s.user?.id);
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";

  const relativeLabels: RelativeTimeLabels = useMemo(
    () => ({
      justNow: t("chat.timeJustNow"),
      minutesAgo: (c: number) => t("chat.timeMinutesAgo", { count: c }),
      hoursAgo: (c: number) => t("chat.timeHoursAgo", { count: c }),
      daysAgo: (c: number) => t("chat.timeDaysAgo", { count: c }),
      olderThanOneWeek: (iso: string) =>
        new Date(iso).toLocaleDateString(localeTag, { month: "short", day: "numeric" }),
    }),
    [t, localeTag]
  );

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
  });

  const pending = useQuery({
    queryKey: ["conversations", "pending"],
    queryFn: listPendingConversations,
  });

  const accept = useMutation({
    mutationFn: acceptConversation,
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["conversations", "pending"] });
      toast.success(t("common.saved"));
    },
  });

  const reject = useMutation({
    mutationFn: rejectConversation,
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["conversations", "pending"] });
    },
  });

  const refreshing = conversations.isFetching || pending.isFetching;

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            conversations.refetch();
            pending.refetch();
          }}
          tintColor={colors.brand}
        />
      }
    >
      <PageHeader
        title={t("chat.title")}
        action={
          <Button size="sm" onPress={() => router.push("/(tabs)/chat/new")}>
            {t("chat.newChat")}
          </Button>
        }
      />

      {pending.data && pending.data.length > 0 ? (
        <PendingInviteSection
          invites={pending.data}
          meId={meId}
          title={t("chat.pendingTitle")}
          invitedHint={t("chat.pendingInvited")}
          acceptLabel={t("chat.accept")}
          rejectLabel={t("chat.reject")}
          groupFallback={t("chat.groupFallback")}
          directFallback={t("chat.directFallback")}
          onAccept={(id) => accept.mutate(id)}
          onReject={(id) => reject.mutate(id)}
        />
      ) : null}

      {conversations.isPending ? (
        <LoadingState />
      ) : conversations.isError ? (
        <ErrorState error={conversations.error} onRetry={() => conversations.refetch()} />
      ) : conversations.data.length === 0 ? (
        <EmptyState
          title={t("chat.noConversations")}
          action={
            <Button onPress={() => router.push("/(tabs)/chat/new")}>{t("chat.newChat")}</Button>
          }
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {conversations.data.map((c) => {
            const title = getConversationDisplayTitle(c, meId, {
              group: t("chat.groupFallback"),
              direct: t("chat.directFallback"),
            });
            const preview = getConversationListPreview(c, meId, {
              recalled: t("chat.deleted"),
              emptyDash: t("chat.emptyListPreview"),
              youPrefix: t("chat.previewYouPrefix"),
            });
            const timeLabel = c.last_message?.created_at
              ? relative(c.last_message.created_at, relativeLabels)
              : "";
            return (
              <ConversationListItem
                key={c.id}
                title={title}
                preview={preview}
                timeLabel={timeLabel}
                unreadCount={c.unread_count}
                isPinned={c.is_pinned}
                isMuted={c.is_muted}
                pinnedLabel={t("chat.listPinned")}
                mutedLabel={t("chat.listMuted")}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/chat/[conversationId]",
                    params: { conversationId: c.id },
                  })
                }
              />
            );
          })}
        </View>
      )}
    </ScreenScroll>
  );
}
