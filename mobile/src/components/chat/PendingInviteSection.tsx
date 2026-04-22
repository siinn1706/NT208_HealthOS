import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ConversationDTO } from "@/api/endpoints/conversations";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/theme";
import { getConversationDisplayTitle } from "@/utils/chat-presentation";

export interface PendingInviteSectionProps {
  invites: ConversationDTO[];
  meId?: string | null;
  title: string;
  invitedHint: string;
  acceptLabel: string;
  rejectLabel: string;
  groupFallback: string;
  directFallback: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

function InviteAvatar({ name }: { name: string }) {
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

export function PendingInviteSection({
  invites,
  meId,
  title,
  invitedHint,
  acceptLabel,
  rejectLabel,
  groupFallback,
  directFallback,
  onAccept,
  onReject,
}: PendingInviteSectionProps) {
  const { colors, fontWeights, typography, spacing } = useTheme();
  if (!invites.length) return null;
  return (
    <Card>
      <Text
        style={{
          color: colors.text,
          fontWeight: fontWeights.semibold,
          fontSize: typography.lg.fontSize,
          marginBottom: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        {title}
      </Text>
      <View style={{ gap: 0 }}>
        {invites.map((c, idx) => {
          const name = getConversationDisplayTitle(c, meId, {
            group: groupFallback,
            direct: directFallback,
          });
          return (
            <View
              key={c.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                paddingVertical: spacing.sm,
                borderBottomWidth: idx < invites.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.border,
              }}
            >
              <InviteAvatar name={name} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>{name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>{invitedHint}</Text>
              </View>
              <Pressable
                onPress={() => onAccept(c.id)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={acceptLabel}
              >
                <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>{acceptLabel}</Text>
              </Pressable>
              <Pressable
                onPress={() => onReject(c.id)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={rejectLabel}
              >
                <Text style={{ color: colors.danger, fontWeight: fontWeights.semibold }}>{rejectLabel}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
