import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

export interface TimelineItem {
  id: string;
  year: number;
  node: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  const t = useTheme();

  const byYear = items.reduce<Record<number, TimelineItem[]>>((acc, item) => {
    (acc[item.year] = acc[item.year] ?? []).push(item);
    return acc;
  }, {});
  const years = (Object.keys(byYear) as unknown as number[]).sort((a, b) => b - a);

  return (
    <View>
      {years.map((year, yi) => (
        <View key={year}>
          <Text style={[typography.micro, s.yearLabel, { color: t.ink4, marginTop: yi > 0 ? 16 : 0 }]}>
            {year}
          </Text>
          {byYear[year].map((item, i) => {
            const isLast = i === byYear[year].length - 1 && yi === years.length - 1;
            return (
              <View key={item.id} style={s.row}>
                <View style={s.col}>
                  <View style={[s.dot, { backgroundColor: t.brand, borderColor: t.card }]} />
                  {!isLast && <View style={[s.line, { backgroundColor: t.border }]} />}
                </View>
                <View style={s.content}>{item.node}</View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  yearLabel: { marginLeft: 36, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' },
  row:       { flexDirection: 'row', marginBottom: 8 },
  col:       { width: 28, alignItems: 'center' },
  dot:       { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 14, zIndex: 1 },
  line:      { flex: 1, width: 1.5, marginTop: 2 },
  content:   { flex: 1 },
});
