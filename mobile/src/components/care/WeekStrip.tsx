import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import type { WeekDay } from '../../api/viewModels';

interface WeekStripProps {
  days: WeekDay[];
  selectedDate?: number;
  onSelect?: (date: number) => void;
}

export function WeekStrip({ days, selectedDate, onSelect }: WeekStripProps) {
  const t = useTheme();

  return (
    <View style={styles.strip}>
      {days.map((day) => {
        const active = day.isToday || day.date === selectedDate;
        return (
          <Pressable
            key={day.date}
            onPress={() => onSelect?.(day.date)}
            style={[
              styles.cell,
              {
                borderColor: active ? t.brand : t.border,
                backgroundColor: active ? t.brand : 'transparent',
                borderRadius: t.radius.md,
              },
            ]}
            accessibilityLabel={`${day.label} ${day.date}`}
          >
            <Text style={[typography.micro, { color: active ? '#FFFFFF' : t.ink3 }]}>
              {day.label.slice(0, 1).toUpperCase()}
            </Text>
            <Text
              style={[
                typography.caption,
                { color: active ? '#FFFFFF' : t.ink, fontFamily: 'Inter_600SemiBold' },
              ]}
            >
              {day.date}
            </Text>
            {day.hasEvent && (
              <View style={[styles.dot, { backgroundColor: active ? '#FFFFFF' : t.brand }]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 6, marginVertical: 8, paddingHorizontal: 16 },
  cell:  { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 4, borderWidth: StyleSheet.hairlineWidth },
  dot:   { width: 4, height: 4, borderRadius: 2 },
});
