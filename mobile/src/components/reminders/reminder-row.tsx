import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { IconCheck, IconBell, IconCalendar, IconActivity, IconHeart, IconMore } from '../../icons';

type ReminderCategory = 'med' | 'appt' | 'vitals' | 'activity' | 'goal' | 'care';

export type ReminderRowData = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  category: ReminderCategory;
  overdue?: boolean;
  done?: boolean;
  terminal?: boolean;
  statusLabel?: string;
  statusColor?: string;
  joined?: boolean;
};

type Props = ReminderRowData & {
  onDone?: () => void;
  onSnooze?: () => void;
  onMore?: () => void;
  onPress?: () => void;
  showDivider?: boolean;
};

const ICON_SIZE = 18;

function CategoryIcon({ category, color }: { category: ReminderCategory; color: string }) {
  switch (category) {
    case 'med':      return <IconBell size={ICON_SIZE} color={color} />;
    case 'appt':     return <IconCalendar size={ICON_SIZE} color={color} />;
    case 'vitals':   return <IconHeart size={ICON_SIZE} color={color} />;
    case 'activity': return <IconActivity size={ICON_SIZE} color={color} />;
    default:         return <IconBell size={ICON_SIZE} color={color} />;
  }
}

export function ReminderRow({
  title, subtitle, time, category, overdue, done, terminal, statusLabel, statusColor, joined, showDivider,
  onDone, onSnooze, onMore, onPress,
}: Props) {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  const catColor = overdue ? t.danger : category === 'activity' ? t.success : category === 'goal' ? t.warning : t.brand;
  const isTerminal = Boolean(done || terminal);
  const chipColor = statusColor ?? t.success;
  const rowBg = overdue ? `${t.danger}0F` : isTerminal ? t.bgElev : t.card;

  const joinedStyle = joined
    ? {
        borderRadius: 0,
        borderWidth: 0,
        marginBottom: 0,
        marginHorizontal: 0,
        paddingHorizontal: 16,
        borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: t.border,
      }
    : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.row,
        { backgroundColor: rowBg, borderColor: overdue ? `${t.danger}30` : t.border },
        joinedStyle,
      ]}
    >
      {/* Category icon cell — 38px rounded square */}
      <View style={[styles.iconCell, { backgroundColor: `${catColor}18`, borderRadius: 11 }]}>
        <CategoryIcon category={category} color={catColor} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Title row: title · time inline */}
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.titleText,
              {
                color: done ? t.ink3 : t.ink,
                textDecorationLine: done ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {time !== '--' && (
            <Text style={[styles.timeInline, { color: overdue ? t.danger : t.ink3 }]}>
              {' · '}{time}
            </Text>
          )}
        </View>
        <Text style={[styles.subtitleText, { color: t.ink3 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* Right slot: action button or more dots or done chip */}
      <View style={styles.rightSlot}>
        {isTerminal ? (
          <View style={[styles.doneChip, { backgroundColor: `${chipColor}15` }]}>
            <IconCheck size={10} color={chipColor} />
            <Text style={[styles.doneChipText, { color: chipColor }]}>{statusLabel ?? i18n('reminders.done')}</Text>
          </View>
        ) : overdue && onDone ? (
          <TouchableOpacity onPress={onDone} style={[styles.actionPill, { backgroundColor: t.danger }]}>
            <Text style={[styles.actionPillText, { color: '#fff' }]}>{i18n('reminders.resolve')}</Text>
          </TouchableOpacity>
        ) : !overdue && (onDone || onSnooze) ? (
          <View style={styles.actionGroup}>
            {onSnooze && (
              <TouchableOpacity onPress={onSnooze} style={[styles.actionPill, styles.secondaryPill, { borderColor: t.border }]}>
                <Text style={[styles.actionPillText, { color: t.ink3 }]}>Snooze</Text>
              </TouchableOpacity>
            )}
            {onDone && (
              <TouchableOpacity onPress={onDone} style={[styles.actionPill, { backgroundColor: t.brand }]}>
                <Text style={[styles.actionPillText, { color: '#fff' }]}>{i18n('reminders.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : onMore ? (
          <TouchableOpacity onPress={onMore} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconMore size={16} color={t.ink4} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    marginHorizontal: 16,
    minHeight: 56,
  },
  iconCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  content:     { flex: 1, minWidth: 0 },
  titleRow:    { flexDirection: 'row', alignItems: 'baseline', minWidth: 0, flexShrink: 1 },
  titleText:   { fontSize: 13, fontWeight: '700', color: '#0F2743', flexShrink: 1 },
  timeInline:  { fontSize: 12, fontWeight: '500', flexShrink: 0 },
  subtitleText:{ fontSize: 11, marginTop: 2 },
  rightSlot:   { marginLeft: 10, alignItems: 'flex-end', flexShrink: 0 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionPill:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, minWidth: 60, alignItems: 'center' },
  secondaryPill: { borderWidth: 1, backgroundColor: 'transparent', minWidth: 0, paddingHorizontal: 10 },
  actionPillText: { fontSize: 12, fontWeight: '700' },
  doneChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  doneChipText:{ fontSize: 10, fontWeight: '600', marginLeft: 3 },
});
