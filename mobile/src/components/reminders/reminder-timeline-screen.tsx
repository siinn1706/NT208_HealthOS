import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/Screen';
import { ApiState } from '../api/ApiState';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { reminderService } from '../../api/services';
import { ChevronLeft } from '../../icons';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function catColor(t: ReturnType<typeof useTheme>, category: string) {
  if (category === 'appointment') return t.brand;
  if (category === 'exercise') return t.success;
  return t.brand;
}

export function ReminderTimelineScreen() {
  const t = useTheme();
  const [view, setView] = useState<'Day' | 'Week'>('Day');
  const now = useMemo(() => new Date(), []);
  const dayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const weekStart = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const weekEnd = useMemo(() => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [now]);
  const nowHour = now.getHours();

  const loadOccurrences = useCallback(
    () => reminderService.occurrences({ from: weekStart.toISOString(), to: weekEnd.toISOString(), tzid: 'Asia/Ho_Chi_Minh' }),
    [weekEnd, weekStart],
  );
  const occurrences = useApiQuery(
    queryKeys.reminderOccurrences(`${weekStart.toISOString()}:${weekEnd.toISOString()}`),
    loadOccurrences,
  );

  const dayEvents = useMemo(() => {
    const key = dayStart.toISOString().slice(0, 10);
    return (occurrences.data ?? [])
      .filter((item) => item.scheduled_at.startsWith(key))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [dayStart, occurrences.data]);

  const weekData = useMemo(() => {
    const rows = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const items = (occurrences.data ?? []).filter((item) => item.scheduled_at.startsWith(key));
      const done = items.filter((item) => item.status === 'done').length;
      const pct = items.length ? Math.round((done / items.length) * 100) : 0;
      return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), pct };
    });
    return rows;
  }, [occurrences.data, weekStart]);

  const categoryBreakdown = useMemo(() => {
    const buckets: Record<string, { total: number; done: number }> = {
      medicine: { total: 0, done: 0 },
      appointment: { total: 0, done: 0 },
      exercise: { total: 0, done: 0 },
    };
    for (const item of occurrences.data ?? []) {
      if (!buckets[item.type]) continue;
      buckets[item.type].total += 1;
      if (item.status === 'done') buckets[item.type].done += 1;
    }
    return [
      { label: 'Medication', type: 'medicine', color: t.brand },
      { label: 'Appointment', type: 'appointment', color: t.brand },
      { label: 'Activity', type: 'exercise', color: t.success },
    ].map((row) => {
      const bucket = buckets[row.type];
      const pct = bucket.total ? Math.round((bucket.done / bucket.total) * 100) : 0;
      return { label: row.label, pct, color: row.color };
    });
  }, [occurrences.data, t.brand, t.success]);

  return (
    <Screen>
      <View style={styles.backBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>Timeline</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented */}
      <View style={[styles.segmented, { backgroundColor: t.bgElev }]}>
        {(['Day', 'Week'] as const).map((v) => (
          <TouchableOpacity key={v} onPress={() => setView(v)} style={[styles.segTab, view === v && { backgroundColor: t.card }]}>
            <Text style={[typography.body, { color: view === v ? t.ink : t.ink3, fontWeight: view === v ? '600' : '400' }]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {occurrences.isLoading && <ApiState title="Loading timeline" loading />}
      {occurrences.error && (
        <ApiState
          title="Timeline unavailable"
          message={occurrences.error.message}
          actionLabel="Retry"
          onAction={occurrences.reload}
        />
      )}

      {view === 'Day' ? (
        <ScrollView contentContainerStyle={styles.dayContent}>
          {HOURS.map((hour) => {
            const eventsAtHour = dayEvents.filter((event) => new Date(event.scheduled_at).getHours() === hour);
            const event = eventsAtHour[0];
            const isNow = hour === nowHour;
            return (
              <View key={hour} style={styles.hourRow}>
                <Text style={[typography.micro, { color: t.ink3, width: 44, textAlign: 'right', paddingRight: 8 }]}>
                  {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                </Text>
                <View style={styles.hourLine}>
                  {isNow && <View style={[styles.nowLine, { backgroundColor: t.danger }]} />}
                  {event && (
                    <View style={[styles.eventPill, { backgroundColor: `${catColor(t, event.type)}20`, borderLeftColor: catColor(t, event.type) }]}>
                      <Text style={[typography.body, { color: catColor(t, event.type), fontWeight: '600' }]}>{event.title}</Text>
                      {eventsAtHour.length > 1 && (
                        <Text style={[typography.micro, { color: catColor(t, event.type), marginTop: 2 }]}>+{eventsAtHour.length - 1} more</Text>
                      )}
                    </View>
                  )}
                  {!event && <View style={[styles.gridLine, { backgroundColor: t.border }]} />}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.weekContent}>
          <View style={styles.weekGrid}>
            {weekData.map((day) => (
              <View key={day.day} style={styles.weekCol}>
                <Text style={[typography.micro, { color: t.ink3, marginBottom: 6 }]}>{day.day}</Text>
                <View style={[styles.weekCircle, { borderColor: day.pct === 100 ? t.success : day.pct > 0 ? t.brand : t.border, backgroundColor: day.pct === 100 ? `${t.success}20` : 'transparent' }]}>
                  <Text style={[typography.micro, { color: day.pct === 100 ? t.success : t.ink3 }]}>{day.pct}%</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={[styles.breakdown, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[typography.body, { color: t.ink, fontWeight: '600', marginBottom: 10 }]}>Category breakdown</Text>
            {categoryBreakdown.map((row) => (
              <View key={row.label} style={styles.breakRow}>
                <Text style={[typography.body, { color: t.ink3, width: 90 }]}>{row.label}</Text>
                <View style={[styles.breakBar, { backgroundColor: t.bgElev }]}>
                  <View style={[styles.breakFill, { backgroundColor: row.color, width: `${row.pct}%` as any }]} />
                </View>
                <Text style={[typography.body, { color: row.color, width: 36, textAlign: 'right' }]}>{row.pct}%</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { flexDirection: 'row', alignItems: 'center' },
  segmented:   { flexDirection: 'row', marginHorizontal: 16, borderRadius: 10, padding: 3, marginBottom: 12 },
  segTab:      { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  dayContent:  { paddingBottom: 32 },
  hourRow:     { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  hourLine:    { flex: 1, paddingVertical: 4, paddingRight: 16 },
  nowLine:     { height: 2, borderRadius: 1, marginBottom: 2 },
  gridLine:    { height: 1, marginVertical: 20, opacity: 0.4 },
  eventPill:   { padding: 8, borderRadius: 8, borderLeftWidth: 3, marginBottom: 2 },
  weekContent: { paddingHorizontal: 16, paddingBottom: 32 },
  weekGrid:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  weekCol:     { alignItems: 'center' },
  weekCircle:  { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  breakdown:   { padding: 16, borderRadius: 14, borderWidth: 1 },
  breakRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  breakBar:    { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  breakFill:   { height: '100%', borderRadius: 3 },
});
