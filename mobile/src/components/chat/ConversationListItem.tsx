import React from "react";
import { Pressable, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/theme";

export interface ConversationListItemProps {
  title: string;
  preview: string;
  timeLabel: string;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  pinnedLabel: string;
  mutedLabel: string;
  onPress: () => void;
}

function InitialAvatar({ name }: { name: string }) {
  const { colors, radius, fontWeights } = useTheme();
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
      <Text style={{ color: colors.brand, fontWeight: fontWeights.bold }}>
        {(name ?? "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function ConversationListItem({
  title,
  preview,
  timeLabel,
  unreadCount,
  isPinned,
  isMuted,
  pinnedLabel,
  mutedLabel,
  onPress,
}: ConversationListItemProps) {
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  const unreadDisplay =
    unreadCount != null && unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <InitialAvatar name={title} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.xs }}>
              <Text
                style={{ color: colors.text, fontWeight: fontWeights.semibold, flex: 1, minWidth: 0 }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              {isPinned ? (
                <Badge tone="brand">{pinnedLabel}</Badge>
              ) : null}
              {isMuted ? (
                <Badge tone="neutral">{mutedLabel}</Badge>
              ) : null}
            </View>
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, marginTop: 4 }}
            >
              {preview}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", minWidth: 56 }}>
            <Text
              style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, textAlign: "right" }}
              numberOfLines={1}
            >
              {timeLabel}
            </Text>
            {unreadDisplay ? (
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
                <Text
                  style={{
                    color: colors.brandText,
                    fontSize: typography["2xs"].fontSize,
                    lineHeight: typography["2xs"].lineHeight,
                    fontWeight: fontWeights.bold,
                  }}
                >
                  {unreadDisplay}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
