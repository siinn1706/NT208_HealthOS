import React from "react";
import { Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/theme";

export type AlertBannerTone = "danger" | "warning" | "info" | "neutral";

export interface AlertBannerItem {
  id: string;
  tone: AlertBannerTone;
  label: string;
  message: string;
}

export interface AlertBannerProps {
  items: AlertBannerItem[];
}

export function AlertBanner({ items }: AlertBannerProps) {
  const { colors, spacing } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((a) => (
        <View
          key={a.id}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: spacing.sm,
          }}
        >
          <Badge tone={a.tone}>{a.label}</Badge>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text }}>{a.message}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
