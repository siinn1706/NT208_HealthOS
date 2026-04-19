import React from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  acceptConversation,
  listConversations,
  listPendingConversations,
  rejectConversation,
} from "@/api/endpoints/conversations";
import { sessionStore } from "@/auth/session";
import { relative } from "@/utils/date";

export default function ChatListScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  const meId = sessionStore((s) => s.user?.id);

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
        <Card>
          <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: typography.lg.fontSize, marginBottom: spacing.sm }}>
            {t("chat.pendingTitle")}
          </Text>
          <View style={{ gap: spacing.md }}>
            {pending.data.map((c) => (
              <View
                key={c.id}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
              >
                <Avatar name={titleFor(c, meId)} colors={colors} radius={radius} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>
                    {titleFor(c, meId)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                    {t("chat.pendingInvited")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => accept.mutate(c.id)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("chat.accept")}
                >
                  <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>
                    {t("chat.accept")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => reject.mutate(c.id)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("chat.reject")}
                >
                  <Text style={{ color: colors.danger, fontWeight: fontWeights.semibold }}>
                    {t("chat.reject")}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {conversations.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : conversations.isError ? (
        <Card>
          <ErrorState error={conversations.error} onRetry={() => conversations.refetch()} />
        </Card>
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
            const title = titleFor(c, meId);
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={title}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/chat/[conversationId]",
                    params: { conversationId: c.id },
                  })
                }
              >
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Avatar name={title} colors={colors} radius={radius} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                        <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, flex: 1 }}>
                          {title}
                        </Text>
                        {c.is_pinned ? <Badge tone="brand">pinned</Badge> : null}
                        {c.is_muted ? <Badge tone="neutral">muted</Badge> : null}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, marginTop: 2 }}
                      >
                        {c.last_message?.content ?? "—"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                        {c.last_message?.created_at ? relative(c.last_message.created_at) : ""}
                      </Text>
                      {c.unread_count ? (
                        <View
                          style={{
                            marginTop: 2,
                            backgroundColor: colors.brand,
                            borderRadius: radius.pill,
                            paddingHorizontal: 6,
                            minWidth: 22,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ color: colors.brandText, fontSize: 11, fontWeight: fontWeights.bold }}>
                            {c.unread_count}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenScroll>
  );
}

function titleFor(c: import("@/api/endpoints/conversations").ConversationDTO, meId?: string | null): string {
  // Pure helper, no hooks — caller renders these from inside a translated
  // context. We deliberately keep the fallbacks as English literals that the
  // calling component can swap to t("chat.groupFallback") / t("chat.directFallback")
  // if needed; today's callers display the title verbatim.
  if (c.title) return c.title;
  if (c.type !== "direct") return "Group";
  const other = c.participants?.find((p) => p.id !== meId);
  return other?.display_name ?? "Direct chat";
}

function Avatar({
  name,
  colors,
  radius,
}: {
  name: string;
  colors: ReturnType<typeof useTheme>["colors"];
  radius: ReturnType<typeof useTheme>["radius"];
}) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: colors.brandMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.brand, fontWeight: "700" }}>
        {(name ?? "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
