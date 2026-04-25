import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import type { WeekDay } from '../../mocks/appointments';

interface WeekStripProps {
  days: WeekDay[];
  selectedDate?: number;
  onSelect?: (date: number) => void;
}

export function WeekStrip({ days, selectedDate, onSelect }: WeekStripProps) {
  const t = useTheme();

  return (
    <View style={[styles.strip, { backgroundColor: t.card, borderRadius: t.radius.lg }]}>
      {days.map((day) => {
        const active = day.isToday || day.date === selectedDate;
        return (
          <Pressable
            key={day.date}
            onPress={() => onSelect?.(day.date)}
            style={styles.cell}
            accessibilityLabel={`${day.label} ${day.date}`}
          >
            <Text style={[typography.micro, { color: active ? t.brand : t.ink3 }]}>
              {day.label}
            </Text>
            <View
              style={[
                styles.circle,
                active && { backgroundColor: t.brand },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  { color: active ? '#FFF' : t.ink, fontFamily: 'Inter_600SemiBold' },
                ]}
              >
                {day.date}
              </Text>
            </View>
            {day.hasEvent && (
              <View style={[styles.dot, { backgroundColor: active ? '#FFF' : t.brand }]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip:  { flexDirection: 'row', padding: 12, marginVertical: 8 },
  cell:   { flex: 1, alignItems: 'center', gap: 4 },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dot:    { width: 4, height: 4, borderRadius: 2 },
});
