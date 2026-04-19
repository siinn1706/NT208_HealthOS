import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme";
import { formatDate, formatTime } from "@/utils/date";

type Mode = "date" | "time" | "datetime";

interface DateTimeFieldProps {
  label?: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  mode?: Mode;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  error?: string | null;
}

/**
 * Cross-platform date / time picker that shows a native UI on tap. Android
 * dismisses on first selection (no inline preview), iOS shows an inline
 * spinner. The display is always the parsed `Date` formatted by our helpers.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = "date",
  minimumDate,
  maximumDate,
  placeholder = "Select…",
  error,
}: DateTimeFieldProps) {
  const { colors, radius, spacing, fontWeights, typography } = useTheme();
  const [picking, setPicking] = useState<"date" | "time" | null>(null);

  const startPick = () => {
    if (mode === "datetime") {
      setPicking("date");
      return;
    }
    setPicking(mode);
  };

  const onPickerChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") {
      // Android fires `set` (with date) or `dismissed` (without).
      if (event.type === "dismissed") {
        setPicking(null);
        return;
      }
      if (!picked) {
        setPicking(null);
        return;
      }
      if (mode === "datetime" && picking === "date") {
        // Carry over to time picker preserving the selected calendar day.
        onChange(picked);
        setPicking("time");
        return;
      }
      onChange(picked);
      setPicking(null);
      return;
    }
    // iOS: keep inline picker mounted; just propagate updates.
    if (picked) onChange(picked);
  };

  const display =
    value === null
      ? placeholder
      : mode === "time"
        ? formatTime(value, "HH:mm")
        : mode === "date"
          ? formatDate(value, "MMM D, YYYY")
          : `${formatDate(value, "MMM D, YYYY")} · ${formatTime(value, "HH:mm")}`;

  return (
    <View style={{ gap: spacing.xs, width: "100%" }}>
      {label ? (
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sm.fontSize,
            fontWeight: fontWeights.medium,
          }}
        >
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={startPick}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.inputBackground,
          paddingHorizontal: spacing.md,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: value ? colors.text : colors.textMuted,
            fontSize: typography.base.fontSize,
          }}
        >
          {display}
        </Text>
      </Pressable>
      {error ? (
        <Text style={{ color: colors.danger, fontSize: typography.xs.fontSize }}>
          {error}
        </Text>
      ) : null}

      {picking !== null ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={picking}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={onPickerChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}

export function dateToHHmm(date: Date | null): string {
  if (!date) return "";
  return formatTime(date, "HH:mm");
}

export function hhmmToToday(hhmm: string): Date | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const parts = hhmm.split(":").map((n) => parseInt(n, 10));
  const h = parts[0];
  const m = parts[1];
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(Math.min(23, Math.max(0, h)), Math.min(59, Math.max(0, m)), 0, 0);
  return d;
}
