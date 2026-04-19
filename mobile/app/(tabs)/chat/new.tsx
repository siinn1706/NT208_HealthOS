import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { lookupUsers, type UserLookupResult } from "@/api/endpoints/users";
import {
  createDirectConversation,
  createGroupConversation,
} from "@/api/endpoints/conversations";
import { useDebouncedValue } from "@/utils/debounce";
import { ApiError } from "@/api/errors";

export default function NewChatScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  const [query, setQuery] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [selected, setSelected] = useState<UserLookupResult[]>([]);
  const debounced = useDebouncedValue(query, 350);

  const lookup = useQuery({
    queryKey: ["users", "lookup", debounced],
    enabled: debounced.length > 1,
    queryFn: () => lookupUsers(debounced, 10),
  });

  const directMutation = useMutation({
    mutationFn: (userId: string) => createDirectConversation(userId),
    onSuccess(conv) {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      router.replace({
        pathname: "/(tabs)/chat/[conversationId]",
        params: { conversationId: conv.id },
      });
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : t("chat.couldNotStart"));
    },
  });

  const groupMutation = useMutation({
    mutationFn: () =>
      createGroupConversation({
        title: groupTitle.trim(),
        member_ids: selected.map((u) => u.id),
      }),
    onSuccess(conv) {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      router.replace({
        pathname: "/(tabs)/chat/[conversationId]",
        params: { conversationId: conv.id },
      });
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : t("chat.couldNotCreateGroup"));
    },
  });

  const toggle = (user: UserLookupResult) => {
    setSelected((cur) => {
      const exists = cur.find((u) => u.id === user.id);
      return exists ? cur.filter((u) => u.id !== user.id) : [...cur, user];
    });
  };

  const canSubmit = useMemo(() => {
    if (isGroup) return groupTitle.trim().length > 0 && selected.length >= 2;
    return selected.length === 1;
  }, [isGroup, selected, groupTitle]);

  const onSubmit = () => {
    if (!canSubmit) return;
    if (isGroup) {
      groupMutation.mutate();
    } else if (selected[0]) {
      directMutation.mutate(selected[0].id);
    }
  };

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("chat.newChat")} />
      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          {[
            { value: false, label: t("chat.directChat") },
            { value: true, label: t("chat.groupChat") },
          ].map((opt) => {
            const active = isGroup === opt.value;
            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => setIsGroup(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: active ? colors.brand : colors.surfaceMuted,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: active ? colors.brandText : colors.text,
                    fontWeight: fontWeights.semibold,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {isGroup ? (
          <Input
            label={t("chat.groupTitle")}
            value={groupTitle}
            onChangeText={setGroupTitle}
            containerStyle={{ marginBottom: spacing.md }}
          />
        ) : null}
        <Input
          label={t("common.search")}
          value={query}
          onChangeText={setQuery}
          placeholder={t("chat.searchUsers")}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Card>

      {selected.length > 0 ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, marginBottom: spacing.sm }}>
            {t("chat.selectedHeader")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {selected.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => toggle(u)}
                style={{
                  flexDirection: "row",
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: radius.pill,
                  backgroundColor: colors.brandMuted,
                }}
              >
                <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>
                  {u.display_name}
                </Text>
                <Text style={{ color: colors.brand }}>×</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        {lookup.isFetching ? (
          <LoadingState />
        ) : lookup.data && lookup.data.length > 0 ? (
          <View>
            {lookup.data.map((u) => {
              const isSelected = !!selected.find((s) => s.id === u.id);
              return (
                <Pressable
                  key={u.id}
                  onPress={() => toggle(u)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={u.display_name ?? u.email}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    minHeight: 44,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>
                      {u.display_name}
                    </Text>
                    {u.email ? (
                      <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                        {u.email}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted }}>
            {debounced.length > 1 ? t("chat.noMatches") : t("chat.typeMore")}
          </Text>
        )}
      </Card>

      <Button
        onPress={onSubmit}
        disabled={!canSubmit}
        loading={directMutation.isPending || groupMutation.isPending}
        fullWidth
      >
        {isGroup ? t("common.create") : t("chat.directChat")}
      </Button>
    </ScreenScroll>
  );
}
