import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme";

export interface ChatModeToggleOption {
  value: boolean;
  label: string;
}

export interface ChatModeToggleProps {
  options: ChatModeToggleOption[];
  value: boolean;
  onChange: (next: boolean) => void;
  activeColor: string;
  inactiveSurface: string;
  textColor: string;
  activeTextColor: string;
}

export function ChatModeToggle({
  options,
  value,
  onChange,
  activeColor,
  inactiveSurface,
  textColor,
  activeTextColor,
}: ChatModeToggleProps) {
  const { spacing, radius, fontWeights } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={String(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              minHeight: 44,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: active ? activeColor : inactiveSurface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: active ? activeTextColor : textColor,
                fontWeight: fontWeights.semibold,
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
