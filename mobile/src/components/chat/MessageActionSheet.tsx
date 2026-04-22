import React from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MessageDTO } from "@/api/endpoints/conversations";
import { useTheme } from "@/theme";
import { isMessageActionSheetEligible } from "@/utils/chat-presentation";

const REACTIONS = ["👍", "❤️", "🎉", "🤔", "😂"];

const actionMinHeight = 48;

export interface MessageActionSheetProps {
  title: string;
  message: MessageDTO | null;
  isMine: boolean;
  onClose: () => void;
  onReact: (m: MessageDTO, emoji: string) => void;
  onEdit: (m: MessageDTO) => void;
  onDelete: (m: MessageDTO) => void;
  onPinToggle: (m: MessageDTO) => void;
  labels: {
    edit: string;
    delete: string;
    pin: string;
    unpin: string;
  };
  closeLabel: string;
  recalledHint: string;
  /** Shown when the row is not persisted (pending / failed) — no server mutations. */
  serverActionsBlockedHint: string;
  brandColor: string;
  dangerColor: string;
  mutedColor: string;
  surfaceColor: string;
  borderColor: string;
  sheetCornerRadius: number;
}

export function MessageActionSheet({
  title,
  message,
  isMine,
  onClose,
  onReact,
  onEdit,
  onDelete,
  onPinToggle,
  labels,
  closeLabel,
  recalledHint,
  serverActionsBlockedHint,
  brandColor,
  dangerColor,
  mutedColor,
  surfaceColor,
  borderColor,
  sheetCornerRadius,
}: MessageActionSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { spacing, radius, fontWeights, typography } = useTheme();
  if (!message) return null;

  const bottomPad = Math.max(spacing.lg, insets.bottom, height * 0.02);
  const sheetEligible = isMessageActionSheetEligible(
    message as MessageDTO & { __pending?: boolean; __failed?: boolean }
  );

  if (message.is_recalled) {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={onClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: surfaceColor,
              borderTopLeftRadius: sheetCornerRadius,
              borderTopRightRadius: sheetCornerRadius,
              padding: spacing.base,
              paddingBottom: bottomPad,
              borderWidth: 1,
              borderColor,
            }}
          >
            <Text
              style={{
                color: mutedColor,
                fontSize: typography.xs.fontSize,
                marginBottom: spacing.sm,
              }}
            >
              {title}
            </Text>
            <Text style={{ color: mutedColor, fontSize: typography.sm.fontSize, marginBottom: spacing.md }}>
              {recalledHint}
            </Text>
            <Pressable
              onPress={onClose}
              style={{ minHeight: actionMinHeight, justifyContent: "center", alignItems: "center" }}
              accessibilityRole="button"
            >
              <Text style={{ color: brandColor, fontWeight: fontWeights.semibold }}>{closeLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  if (!sheetEligible) {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={onClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: surfaceColor,
              borderTopLeftRadius: sheetCornerRadius,
              borderTopRightRadius: sheetCornerRadius,
              padding: spacing.base,
              paddingBottom: bottomPad,
              borderWidth: 1,
              borderColor,
            }}
          >
            <Text
              style={{
                color: mutedColor,
                fontSize: typography.xs.fontSize,
                marginBottom: spacing.sm,
              }}
            >
              {title}
            </Text>
            <Text style={{ color: mutedColor, fontSize: typography.sm.fontSize, marginBottom: spacing.md }}>
              {serverActionsBlockedHint}
            </Text>
            <Pressable
              onPress={onClose}
              style={{ minHeight: actionMinHeight, justifyContent: "center", alignItems: "center" }}
              accessibilityRole="button"
            >
              <Text style={{ color: brandColor, fontWeight: fontWeights.semibold }}>{closeLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: surfaceColor,
            borderTopLeftRadius: sheetCornerRadius,
            borderTopRightRadius: sheetCornerRadius,
            padding: spacing.base,
            paddingBottom: bottomPad,
            borderWidth: 1,
            borderColor,
          }}
        >
          <Text
            style={{
              color: mutedColor,
              fontSize: typography.xs.fontSize,
              marginBottom: spacing.sm,
            }}
          >
            {title}
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.sm,
              marginBottom: spacing.md,
              justifyContent: "center",
            }}
          >
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  onReact(message, emoji);
                  onClose();
                }}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  paddingHorizontal: spacing.sm,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor,
                }}
                accessibilityRole="button"
                accessibilityLabel={emoji}
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: borderColor, marginBottom: spacing.sm, opacity: 0.6 }} />

          <Pressable
            onPress={() => {
              onPinToggle(message);
              onClose();
            }}
            style={{ minHeight: actionMinHeight, justifyContent: "center" }}
            accessibilityRole="button"
          >
            <Text style={{ color: brandColor, fontWeight: fontWeights.semibold }}>
              {message.is_pinned ? labels.unpin : labels.pin}
            </Text>
          </Pressable>

          {isMine ? (
            <>
              <View style={{ height: 1, backgroundColor: borderColor, marginVertical: spacing.xs, opacity: 0.6 }} />
              <Pressable
                onPress={() => {
                  onEdit(message);
                  onClose();
                }}
                style={{ minHeight: actionMinHeight, justifyContent: "center" }}
                accessibilityRole="button"
              >
                <Text style={{ color: brandColor, fontWeight: fontWeights.semibold }}>{labels.edit}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onDelete(message);
                  onClose();
                }}
                style={{ minHeight: actionMinHeight, justifyContent: "center" }}
                accessibilityRole="button"
              >
                <Text style={{ color: dangerColor, fontWeight: fontWeights.semibold }}>{labels.delete}</Text>
              </Pressable>
            </>
          ) : null}

          <View style={{ height: 1, backgroundColor: borderColor, marginVertical: spacing.sm, opacity: 0.6 }} />

          <Pressable
            onPress={onClose}
            style={{ minHeight: actionMinHeight, justifyContent: "center", alignItems: "center" }}
            accessibilityRole="button"
          >
            <Text style={{ color: mutedColor }}>{closeLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
