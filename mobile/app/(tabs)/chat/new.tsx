import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
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
import { ChatModeToggle } from "@/components/chat/ChatModeToggle";
import { SelectedUserChip } from "@/components/chat/SelectedUserChip";
import { UserSearchRow } from "@/components/chat/UserSearchRow";

export default function NewChatScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, spacing, radius, typography } = useTheme();

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

  const modeOptions = useMemo(
    () => [
      { value: false as const, label: t("chat.directChat") },
      { value: true as const, label: t("chat.groupChat") },
    ],
    [t]
  );

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("chat.newChat")} />
      <Card>
        <ChatModeToggle
          options={modeOptions}
          value={isGroup}
          onChange={setIsGroup}
          activeColor={colors.brand}
          inactiveSurface={colors.surfaceMuted}
          textColor={colors.text}
          activeTextColor={colors.brandText}
        />
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
          <Text
            style={{
              color: colors.text,
              fontWeight: fontWeights.semibold,
              fontSize: typography.sm.fontSize,
              marginBottom: spacing.sm,
            }}
          >
            {t("chat.selectedHeader")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {selected.map((u) => (
              <SelectedUserChip
                key={u.id}
                name={u.display_name}
                removeAccessibilityLabel={t("chat.removeSelectedA11y", { name: u.display_name })}
                onRemove={() => toggle(u)}
                brandColor={colors.brand}
                brandMuted={colors.brandMuted}
                borderColor={colors.border}
                radius={radius.pill}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        {debounced.length <= 1 ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sm.fontSize,
              textAlign: "center",
              paddingVertical: spacing.md,
            }}
          >
            {t("chat.typeMore")}
          </Text>
        ) : lookup.isError ? (
          <ErrorState
            density="section"
            error={lookup.error}
            onRetry={() => lookup.refetch()}
          />
        ) : lookup.isFetching ? (
          <LoadingState />
        ) : lookup.data && lookup.data.length > 0 ? (
          <View>
            {lookup.data.map((u, i, arr) => {
              const isSelected = !!selected.find((s) => s.id === u.id);
              return (
                <UserSearchRow
                  key={u.id}
                  displayName={u.display_name}
                  email={u.email}
                  selected={isSelected}
                  showDivider={i < arr.length - 1}
                  onPress={() => toggle(u)}
                  textColor={colors.text}
                  mutedColor={colors.textMuted}
                  brandColor={colors.brand}
                  borderColor={colors.border}
                  selectedBackgroundColor={colors.brandMuted}
                />
              );
            })}
          </View>
        ) : (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sm.fontSize,
              textAlign: "center",
              paddingVertical: spacing.md,
            }}
          >
            {t("chat.noMatches")}
          </Text>
        )}
      </Card>

      <View style={{ marginTop: spacing.lg, paddingBottom: spacing.lg }}>
        <Button
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={directMutation.isPending || groupMutation.isPending}
          fullWidth
        >
          {isGroup ? t("chat.startGroupChat") : t("chat.directChat")}
        </Button>
      </View>
    </ScreenScroll>
  );
}
