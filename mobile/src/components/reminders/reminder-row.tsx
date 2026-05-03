import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconCheck, IconBell, IconCalendar, IconActivity, IconHeart } from '../../icons';

type ReminderCategory = 'med' | 'appt' | 'vitals' | 'activity' | 'goal' | 'care';

export type ReminderRowData = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  category: ReminderCategory;
  overdue?: boolean;
  done?: boolean;
};

type Props = ReminderRowData & {
  onDone?: () => void;
  onSnooze?: () => void;
  onPress?: () => void;
};

function CategoryIcon({ category, color }: { category: ReminderCategory; color: string }) {
  const size = 18;
  switch (category) {
    case 'med':      return <IconBell size={size} color={color} />;
    case 'appt':     return <IconCalendar size={size} color={color} />;
    case 'vitals':   return <IconHeart size={size} color={color} />;
    case 'activity': return <IconActivity size={size} color={color} />;
    default:         return <IconBell size={size} color={color} />;
  }
}

export function ReminderRow({ title, subtitle, time, category, overdue, done, onDone, onSnooze, onPress }: Props) {
  const t = useTheme();

  const catColor = overdue ? t.danger : category === 'activity' ? t.success : category === 'goal' ? t.warning : t.brand;
  const rowBg = overdue ? `${t.danger}18` : done ? t.bgElev : t.card;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.row, { backgroundColor: rowBg, borderColor: overdue ? `${t.danger}40` : t.border }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${catColor}20` }]}>
        <CategoryIcon category={category} color={catColor} />
      </View>

      <View style={styles.content}>
        <Text style={[typography.bodyMed, { color: done ? t.ink3 : t.ink, fontWeight: '600', textDecorationLine: done ? 'line-through' : 'none' }]}>
          {title}
        </Text>
        <Text style={[typography.body, { color: t.ink3 }]} numberOfLines={1}>
          {subtitle}
        </Text>

        {!done && (
          <View style={styles.actions}>
            {overdue && (
              <View style={[styles.chip, { backgroundColor: `${t.danger}20` }]}>
                <Text style={[typography.micro, { color: t.danger, fontWeight: '600' }]}>Overdue</Text>
              </View>
            )}
            {!overdue && onDone && (
              <TouchableOpacity onPress={onDone} style={[styles.actionBtn, { backgroundColor: `${t.success}15` }]}>
                <Text style={[typography.micro, { color: t.success, fontWeight: '600' }]}>Done</Text>
              </TouchableOpacity>
            )}
            {onSnooze && (
              <TouchableOpacity onPress={onSnooze} style={[styles.actionBtn, { backgroundColor: t.bgElev }]}>
                <Text style={[typography.micro, { color: t.ink3 }]}>Snooze</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {done && (
          <View style={styles.actions}>
            <View style={[styles.chip, { backgroundColor: `${t.success}15` }]}>
              <IconCheck size={10} color={t.success} />
              <Text style={[typography.micro, { color: t.success, marginLeft: 3 }]}>Done</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.timeBadge, { backgroundColor: t.bgElev }]}>
        <Text style={[typography.micro, { color: t.ink3 }]}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, marginHorizontal: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  content:    { flex: 1 },
  actions:    { flexDirection: 'row', gap: 6, marginTop: 6 },
  actionBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  chip:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  timeBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8, alignSelf: 'flex-start', marginTop: 2 },
});
