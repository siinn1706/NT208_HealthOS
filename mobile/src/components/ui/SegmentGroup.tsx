import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

/**
 * Equally-spaced "segment" selector — the wider, full-width tab strip
 * that preferences (theme/locale) and reminders (today/all) screens
 * use. Replaces ~22 lines of inline JSX per use-case in 3+ screens.
 *
 * Behavior is the same as `PillGroup` (single-select, brand-when-active),
 * but each segment fills equal width so a row of two/three options
 * spans the available horizontal space — that's what makes it "feel"
 * like a tab strip rather than a chip filter.
 *
 * Accessibility: rendered as a `tablist` with each segment as a `tab`,
 * matching what users actually expect to hear via TalkBack/VoiceOver.
 */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

interface SegmentGroupProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function SegmentGroup<T extends string>({
  options,
  value,
  onChange,
  style,
  accessibilityLabel,
}: SegmentGroupProps<T>) {
  const { colors, fontWeights, spacing, radius, typography } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: "row",
          gap: spacing.xs,
          padding: spacing.xs,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceMuted,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.accessibilityLabel ?? opt.label}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              minHeight: 44,
              justifyContent: "center",
              borderRadius: radius.sm,
              backgroundColor: active ? colors.brand : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: active ? colors.brandText : colors.text,
                fontWeight: fontWeights.semibold,
                fontSize: typography.sm.fontSize,
                lineHeight: typography.sm.lineHeight,
                fontFamily: typography.sm.fontFamily,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
