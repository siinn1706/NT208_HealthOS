import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/Screen';
import { Button } from '../primitives/Button';
import { ApiState } from '../api/ApiState';
import { useApiQuery, invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { reminderService } from '../../api/services';
import { ChevronLeft, IconMore, IconCheck } from '../../icons';

function atStartOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function atEndOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function fmtClock(value?: string | null) {
  if (!value) return '--';
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function categoryLabel(type: string) {
  if (type === 'medicine') return 'Medication';
  if (type === 'appointment') return 'Appointment';
  if (type === 'exercise') return 'Activity';
  return 'Reminder';
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function ReminderDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const reminderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isMarking, setIsMarking] = useState(false);

  const now = useMemo(() => new Date(), []);
  const historyFrom = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return atStartOfDay(d).toISOString();
  }, [now]);
  const futureTo = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return atEndOfDay(d).toISOString();
  }, [now]);

  const loadReminders = useCallback(() => reminderService.list(), []);
  const loadOccurrences = useCallback(
    () => reminderService.occurrences({ from: historyFrom, to: futureTo, tzid: 'Asia/Ho_Chi_Minh' }),
    [futureTo, historyFrom],
  );

  const reminders = useApiQuery(queryKeys.remindersAll, loadReminders, { enabled: Boolean(reminderId) });
  const occurrences = useApiQuery(queryKeys.reminderOccurrences(`${historyFrom}:${futureTo}`), loadOccurrences, { enabled: Boolean(reminderId) });

  const reminder = useMemo(() => {
    return (reminders.data ?? []).find((item) => item.id === reminderId) ?? null;
  }, [reminders.data, reminderId]);

  const reminderOccurrences = useMemo(() => {
    return (occurrences.data ?? [])
      .filter((item) => item.reminder_id === reminderId)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [occurrences.data, reminderId]);

  const summary = useMemo(() => {
    const historyDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const history = historyDays.map((day) => {
      const key = dateKey(day);
      const items = reminderOccurrences.filter((occ) => occ.scheduled_at.startsWith(key));
      return items.some((occ) => occ.status === 'done');
    });

    let streak = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (!history[i]) break;
      streak += 1;
    }

    const pastOccurrences = reminderOccurrences.filter((occ) => new Date(occ.scheduled_at).getTime() <= now.getTime());
    const doneCount = pastOccurrences.filter((occ) => occ.status === 'done').length;
    const missedCount = pastOccurrences.filter((occ) => occ.status === 'skipped').length;
    const adherence = pastOccurrences.length ? Math.round((doneCount / pastOccurrences.length) * 100) : 0;
    const upcoming = reminderOccurrences
      .filter((occ) => new Date(occ.scheduled_at).getTime() > now.getTime())
      .slice(0, 3)
      .map((occ) => new Date(occ.scheduled_at).toLocaleString());
    const nextPending = reminderOccurrences.find((occ) => new Date(occ.scheduled_at).getTime() <= now.getTime() && occ.status !== 'done');

    return { history, streak, adherence, missedCount, upcoming, nextPending };
  }, [now, reminderOccurrences]);

  async function handleLogProgress() {
    if (!reminderId || isMarking) return;
    setIsMarking(true);
    try {
      if (summary.nextPending?.id) {
        await reminderService.markDone(reminderId, summary.nextPending.id);
      } else if (reminder && !reminder.done) {
        await reminderService.updateDone(reminderId, true);
      }
      invalidateApiQuery('reminders.');
      reminders.reload();
      occurrences.reload();
    } finally {
      setIsMarking(false);
    }
  }

  if (!reminderId) {
    return (
      <Screen>
        <ApiState title="Reminder not found" message="Missing reminder id in route." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  if (reminders.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading reminder" loading />
      </Screen>
    );
  }

  if (reminders.error) {
    return (
      <Screen>
        <ApiState title="Reminder unavailable" message={reminders.error.message} actionLabel="Retry" onAction={reminders.reload} />
      </Screen>
    );
  }

  if (!reminder) {
    return (
      <Screen>
        <ApiState title="Reminder not found" message="Reminder id not present in current list." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.backBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>Reminder</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <IconMore size={20} color={t.ink3} />
        </TouchableOpacity>
      </View>

      <View style={[styles.hero, { backgroundColor: `${t.brand}15`, borderColor: `${t.brand}30` }]}>
        <Text style={[typography.title, { color: t.brand }]}>{fmtClock(reminder.next_occurrence_at ?? reminder.time)}</Text>
        <Text style={[typography.h3, { color: t.ink, marginTop: 4 }]}>{reminder.title}</Text>
        <View style={[styles.catChip, { backgroundColor: `${t.brand}20` }]}>
          <Text style={[typography.micro, { color: t.brand, fontWeight: '600' }]}>{categoryLabel(reminder.type)}</Text>
        </View>
        <Text style={[typography.body, { color: t.ink3, marginTop: 6 }]}>{reminder.repeat ?? 'Once'}</Text>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'This week', value: `${summary.adherence}%`, color: t.success },
          { label: 'Streak', value: `${summary.streak}d`, color: t.brand },
          { label: 'Missed', value: `${summary.missedCount}`, color: t.danger },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[typography.h3, { color: s.color }]}>{s.value}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 2 }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {occurrences.isLoading && <ApiState title="Loading reminder history" loading />}
      {occurrences.error && <ApiState title="History unavailable" message={occurrences.error.message} actionLabel="Retry" onAction={occurrences.reload} />}

      {!occurrences.isLoading && !occurrences.error && (
        <>
          <View style={[styles.section, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[typography.body, { color: t.ink, fontWeight: '600', marginBottom: 12 }]}>Last 7 days</Text>
            <View style={styles.dotsRow}>
              {summary.history.map((done, idx) => (
                <View key={idx} style={[styles.dot, { backgroundColor: done ? t.success : t.bgElev, borderColor: done ? t.success : t.border }]}>
                  {done && <IconCheck size={10} color="#FFF" />}
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[typography.body, { color: t.ink, fontWeight: '600', marginBottom: 8 }]}>Upcoming</Text>
            {summary.upcoming.length === 0 ? (
              <Text style={[typography.body, { color: t.ink3 }]}>No upcoming occurrences in next 7 days.</Text>
            ) : (
              summary.upcoming.map((date, idx) => (
                <Text key={idx} style={[typography.body, { color: t.ink3, marginBottom: 4 }]}>· {date}</Text>
              ))
            )}
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Button label="Log Progress" variant="solid" onPress={handleLogProgress} loading={isMarking} disabled={occurrences.isLoading || Boolean(occurrences.error)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  hero: { marginHorizontal: 16, marginTop: 4, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  catChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  section: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
