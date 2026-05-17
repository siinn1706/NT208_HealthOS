import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { IconButton } from '../primitives/icon-button';
import { Card } from '../primitives/card';
import { ApiState } from '../api/api-state';
import { ProgressRing } from '../charts/progress-ring';
import { IconBell, IconPlus, IconFilter } from '../../icons';
import { ReminderRow, type ReminderRowData } from './reminder-row';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService, reminderService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';

const FILTER_KEYS = [
  { key: 'filterAll',         type: null },
  { key: 'filterMedication',  type: 'medicine' as const },
  { key: 'filterAppointment', type: 'appointment' as const },
  { key: 'filterVitals',      type: null },
  { key: 'filterActivity',    type: 'exercise' as const },
] as const;

type FilterKey = typeof FILTER_KEYS[number]['key'];

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

// 8-segment status rail — maps rows to colored segments
function SegmentRail({ rows, done, upcoming, overdue }: {
  rows: ReminderRowData[];
  done: ReminderRowData[];
  upcoming: ReminderRowData[];
  overdue: ReminderRowData[];
}) {
  const t = useTheme();
  // Build 8 slots from real rows (or fill with empty)
  const segments = Array.from({ length: 8 }, (_, i) => {
    const row = rows[i];
    if (!row) return 'empty';
    if (row.done)    return 'done';
    if (row.overdue) return 'overdue';
    return 'upcoming';
  });

  const colorMap: Record<string, string> = {
    done: t.success,
    upcoming: t.brand,
    overdue: t.danger,
    empty: t.border,
  };

  return (
    <View style={railStyles.rail}>
      {segments.map((seg, i) => (
        <View
          key={i}
          style={[
            railStyles.segment,
            { backgroundColor: colorMap[seg], flex: 1 },
          ]}
        />
      ))}
    </View>
  );
}

const railStyles = StyleSheet.create({
  rail:    { flexDirection: 'row', gap: 3, marginTop: 12 },
  segment: { height: 6, borderRadius: 3 },
});

export function RemindersCenterScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('filterAll');

  const loadReminders = useCallback(() => {
    const entry = FILTER_KEYS.find((f) => f.key === activeFilter);
    return reminderService.list(entry?.type ?? undefined);
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

  // Derive next upcoming reminder info
  const nextUpcoming = upcoming[0];
  const nextReminderTime = nextUpcoming?.time ?? '--';
  const nextReminderTitle = nextUpcoming?.title ?? 'None';

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

  const progressValue = rows.length > 0 ? done.length / rows.length : 0;

  return (
    <Screen>
      <TopBar
        title={i18n('reminders.title')}
        subtitle={`${upcoming.length} due today · ${overdue.length} overdue`}
        right={
          <View style={styles.topActions}>
            <IconButton icon={<IconFilter size={20} color={t.ink3} />} accessibilityLabel={i18n('common.filter')} />
            <IconButton icon={<IconPlus size={20} color={t.brand} />} variant="filled" accessibilityLabel={i18n('reminders.newReminder')} onPress={() => router.push('/reminders/create' as never)} />
          </View>
        }
      />

      {/* Snapshot card — ProgressRing + text + 8-segment rail */}
      <Card style={styles.snapshotCard}>
        <View style={styles.snapshotRow}>
          <ProgressRing size={64} stroke={7} value={progressValue} color={t.brand} track={t.border}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: t.ink }}>{done.length}/{rows.length}</Text>
          </ProgressRing>
          <View style={styles.snapshotText}>
            <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8 }]}>{i18n('reminders.today')}</Text>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '800', fontSize: 17, marginTop: 2 }]}>
              {done.length} done · {rows.length - done.length} left
            </Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 2 }]} numberOfLines={1}>
              Next at {nextReminderTime} · {nextReminderTitle}
            </Text>
          </View>
        </View>
        <SegmentRail rows={rows} done={done} upcoming={upcoming} overdue={overdue} />
      </Card>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTER_KEYS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? t.brand : 'transparent',
                  borderColor: active ? t.brand : t.border,
                  borderRadius: t.radius.pill,
                },
              ]}
            >
              <Text style={[typography.body, { color: active ? '#fff' : t.ink3, fontWeight: active ? '600' : '400' }]}>
                {i18n(`reminders.${f.key}` as any)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {reminders.isLoading && <ApiState title={i18n('api.loading')} loading />}
      {reminders.error && <ApiState title={i18n('api.unavailable')} message={reminders.error.message} actionLabel={i18n('common.retry')} onAction={reminders.reload} />}
      {!reminders.isLoading && !reminders.error && rows.length === 0 && (
        <ApiState title={i18n('reminders.noReminders')} message={i18n('reminders.noRemindersMessage')} />
      )}

      {overdue.length > 0 && (
        <>
          <SectionHeader title={i18n('reminders.overdue')} />
          <Card style={[styles.joinedCard, { backgroundColor: `${t.danger}08`, borderColor: `${t.danger}30`, padding: 0, overflow: 'hidden' }]}>
            {overdue.map((r, i) => (
              <ReminderRow
                key={r.id}
                {...r}
                joined
                showDivider={i < overdue.length - 1}
                onDone={() => { markDone(r.id); }}
                onPress={() => router.push(`/reminders/${r.id}` as never)}
              />
            ))}
          </Card>
        </>
      )}

      {/* Up Next section — joined card */}
      {upcoming.length > 0 && (
        <>
          <SectionHeader title={i18n('reminders.upNext')} />
          <Card style={[styles.joinedCard, { padding: 0, overflow: 'hidden' }]}>
            {upcoming.map((r, i) => (
              <ReminderRow
                key={r.id}
                {...r}
                joined
                showDivider={i < upcoming.length - 1}
                onDone={() => { markDone(r.id); }}
                onSnooze={() => { snooze(r.id); }}
                onPress={() => router.push(`/reminders/${r.id}` as never)}
              />
            ))}
          </Card>
        </>
      )}

      {done.length > 0 && (
        <>
          <SectionHeader title={i18n('reminders.doneToday')} />
          {done.map((r) => <ReminderRow key={r.id} {...r} onPress={() => router.push(`/reminders/${r.id}` as never)} />)}
        </>
      )}

      <TouchableOpacity onPress={() => router.push('/reminders/notifications' as never)} style={[styles.inboxRow, { backgroundColor: t.card, borderColor: t.border }]}>
        <IconBell size={18} color={t.brand} />
        <Text style={[typography.bodyMed, { color: t.ink, flex: 1, marginLeft: 10 }]}>{i18n('reminders.notificationInbox')}</Text>
        <Text style={[typography.body, { color: t.brand }]}>{unread.data ?? 0} {i18n('reminders.unread')} →</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions:   { flexDirection: 'row', gap: 4 },
  snapshotCard: { marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  snapshotRow:  { flexDirection: 'row', alignItems: 'center' },
  snapshotText: { flex: 1, marginLeft: 12 },
  filterScroll: { marginBottom: 4 },
  filterContent:{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  joinedCard:   { marginHorizontal: 16, marginBottom: 8 },
  inboxRow:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
});
