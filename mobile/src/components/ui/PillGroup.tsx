import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

/**
 * Compact filter-chip selector — the "rounded-pill, brand-when-active"
 * selector that period / metric / range pickers all need. Replaces ~25
 * lines of inline JSX per use-case in 5+ screens (reports, trends,
 * health dashboard, metric detail, PDF export).
 *
 * Single-select only. The `value` is matched by strict equality against
 * each option, and `onChange` fires with the freshly-selected value.
 *
 * Accessibility: each pill is rendered as a standalone `radio` so
 * screen readers announce "selected" / "not selected" correctly.
 */

export interface PillOption<T extends string | number> {
  value: T;
  label: string;
  /** Optional aria-label when the visible label isn't descriptive enough. */
  accessibilityLabel?: string;
}

interface PillGroupProps<T extends string | number> {
  options: PillOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Wrap onto multiple rows when content overflows (default true). */
  wrap?: boolean;
  style?: ViewStyle;
  /** Override the row label (e.g. "Period", "Metric"). Used by VoiceOver. */
  accessibilityLabel?: string;
}

export function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  wrap = true,
  style,
  accessibilityLabel,
}: PillGroupProps<T>) {
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: "row",
          gap: spacing.xs,
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.accessibilityLabel ?? opt.label}
            // 44dp minHeight + centered content gives the chip a WCAG
            // 2.1 AA-compliant touch target without making it visually
            // taller than the previous inline implementation. The
            // padding values stay the same so the visible chip looks
            // identical; just the hit-area floor is enforced.
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
              minHeight: 44,
              justifyContent: "center",
              borderRadius: radius.pill,
              backgroundColor: active ? colors.brand : colors.surfaceMuted,
            }}
          >
            <Text
              style={{
                color: active ? colors.brandText : colors.text,
                fontWeight: fontWeights.semibold,
                fontSize: typography.xs.fontSize,
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
