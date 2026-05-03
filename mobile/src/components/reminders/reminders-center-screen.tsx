import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { SectionHeader } from '../layout/SectionHeader';
import { IconButton } from '../primitives/IconButton';
import { ApiState } from '../api/ApiState';
import { IconBell, IconPlus, IconFilter } from '../../icons';
import { ReminderRow, type ReminderRowData } from './reminder-row';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService, reminderService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';

const FILTERS = ['All', 'Medication', 'Appointment', 'Vitals', 'Activity'];
const TYPE_BY_FILTER: Record<string, 'medicine' | 'appointment' | 'exercise' | null> = {
  All: null,
  Medication: 'medicine',
  Appointment: 'appointment',
  Vitals: null,
  Activity: 'exercise',
};

function timeLabel(value?: string | null, fallback?: string | null) {
  const source = value ?? fallback;
  if (!source) return '--';
  if (/^\d{2}:\d{2}$/.test(source)) return source;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source;
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function mapCategory(type: string): ReminderRowData['category'] {
  if (type === 'medicine') return 'med';
  if (type === 'appointment') return 'appt';
  if (type === 'exercise') return 'activity';
  return 'care';
}

export function RemindersCenterScreen() {
  const t = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');

  const loadReminders = useCallback(() => {
    const type = TYPE_BY_FILTER[activeFilter];
    return reminderService.list(type ?? undefined);
  }, [activeFilter]);
  const loadUnread = useCallback(() => notificationService.unreadCount(), []);

  const reminders = useApiQuery(queryKeys.remindersAll + '.' + activeFilter, loadReminders);
  const unread = useApiQuery(queryKeys.unreadNotifications, loadUnread);

  const rows = useMemo<ReminderRowData[]>(() => {
    return (reminders.data ?? []).map((item) => {
      const nextAt = item.next_occurrence_at ?? null;
      const overdue = Boolean(!item.done && nextAt && new Date(nextAt).getTime() < Date.now());
      return {
        id: item.id,
        title: item.title,
        subtitle: item.note ?? `${item.type} · ${item.repeat ?? 'once'}`,
        time: timeLabel(nextAt, item.time),
        category: mapCategory(item.type),
        overdue,
        done: Boolean(item.done),
      };
    });
  }, [reminders.data]);

  const overdue = rows.filter((r) => r.overdue);
  const upcoming = rows.filter((r) => !r.overdue && !r.done);
  const done = rows.filter((r) => r.done);

  async function markDone(reminderId: string) {
    await reminderService.updateDone(reminderId, true);
    invalidateApiQuery('reminders.');
    reminders.reload();
  }

  async function snooze(reminderId: string) {
    await reminderService.snooze(reminderId, { minutes: 10 });
    invalidateApiQuery('reminders.');
    reminders.reload();
  }

  return (
    <Screen>
      <TopBar
        title="Reminders"
        subtitle={`${upcoming.length} due today · ${overdue.length} overdue`}
        right={
          <View style={styles.topActions}>
            <IconButton icon={<IconFilter size={20} color={t.ink3} />} accessibilityLabel="Filter" />
            <IconButton icon={<IconPlus size={20} color={t.brand} />} variant="filled" accessibilityLabel="New reminder" onPress={() => router.push('/reminders/create' as never)} />
          </View>
        }
      />

      <View style={[styles.snapshot, { backgroundColor: t.card, borderColor: t.border }]}>
        {[
          { label: 'Done', count: done.length, color: t.success },
          { label: 'Upcoming', count: upcoming.length, color: t.brand },
          { label: 'Overdue', count: overdue.length, color: t.danger },
        ].map((item) => (
          <View key={item.label} style={styles.snapItem}>
            <Text style={[typography.h3, { color: item.color }]}>{item.count}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 2 }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[styles.chip, { backgroundColor: activeFilter === f ? t.brand : t.bgElev, borderColor: activeFilter === f ? t.brand : t.border }]}
          >
            <Text style={[typography.body, { color: activeFilter === f ? '#FFF' : t.ink3, fontWeight: activeFilter === f ? '600' : '400' }]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {reminders.isLoading && <ApiState title="Loading reminders" loading />}
      {reminders.error && <ApiState title="Reminders unavailable" message={reminders.error.message} actionLabel="Retry" onAction={reminders.reload} />}
      {!reminders.isLoading && !reminders.error && rows.length === 0 && (
        <ApiState title="No reminders yet" message="Create your first reminder to track medications and appointments." />
      )}

      {overdue.length > 0 && (
        <>
          <SectionHeader title="Overdue" />
          {overdue.map((r) => <ReminderRow key={r.id} {...r} onPress={() => router.push(`/reminders/${r.id}` as never)} />)}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionHeader title="Up Next" />
          {upcoming.map((r) => (
            <ReminderRow
              key={r.id}
              {...r}
              onDone={() => { markDone(r.id); }}
              onSnooze={() => { snooze(r.id); }}
              onPress={() => router.push(`/reminders/${r.id}` as never)}
            />
          ))}
        </>
      )}

      {done.length > 0 && (
        <>
          <SectionHeader title="Done Today" />
          {done.map((r) => <ReminderRow key={r.id} {...r} onPress={() => router.push(`/reminders/${r.id}` as never)} />)}
        </>
      )}

      <TouchableOpacity onPress={() => router.push('/reminders/notifications' as never)} style={[styles.inboxRow, { backgroundColor: t.card, borderColor: t.border }]}>
        <IconBell size={18} color={t.brand} />
        <Text style={[typography.bodyMed, { color: t.ink, flex: 1, marginLeft: 10 }]}>Notification inbox</Text>
        <Text style={[typography.body, { color: t.brand }]}>{unread.data ?? 0} unread →</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions:    { flexDirection: 'row', gap: 4 },
  snapshot:      { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 8, marginBottom: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  snapItem:      { alignItems: 'center' },
  filterScroll:  { marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  inboxRow:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
});
