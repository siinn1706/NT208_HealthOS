import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography, tabularNums } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { ApiState } from '../api/api-state';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { reminderService } from '../../api/services';
import { ChevronLeft, IconCalendar, IconBell, IconActivity } from '../../icons';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function fmtHour(h: number) {
  if (h === 12) return '12pm';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function catColor(t: ReturnType<typeof useTheme>, category: string) {
  if (category === 'appointment') return t.brand;
  if (category === 'exercise')    return t.success;
  return t.brand;
}

function EventIcon({ type, color }: { type: string; color: string }) {
  const s = 14;
  if (type === 'appointment') return <IconCalendar size={s} color={color} />;
  if (type === 'exercise')    return <IconActivity size={s} color={color} />;
  return <IconBell size={s} color={color} />;
}

export function ReminderTimelineScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [view, setView] = useState<'Day' | 'Week'>('Day');

  const now       = useMemo(() => new Date(), []);
  const dayStart  = useMemo(() => { const d = new Date(now); d.setHours(0,0,0,0); return d; }, [now]);
  const weekStart = useMemo(() => { const d = new Date(now); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d; }, [now]);
  const weekEnd   = useMemo(() => { const d = new Date(now); d.setHours(23,59,59,999); return d; }, [now]);
  const nowHour   = now.getHours();

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
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key   = d.toISOString().slice(0, 10);
      const items = (occurrences.data ?? []).filter((item) => item.scheduled_at.startsWith(key));
      const done  = items.filter((item) => item.status === 'done').length;
      const pct   = items.length ? Math.round((done / items.length) * 100) : 0;
      return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), pct, total: items.length };
    });
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
      { label: 'Medication',   type: 'medicine',    color: t.brand },
      { label: 'Appointment',  type: 'appointment', color: t.brand },
      { label: 'Activity',     type: 'exercise',    color: t.success },
    ].map((row) => {
      const b   = buckets[row.type];
      const pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
      return { label: row.label, pct, color: row.color };
    });
  }, [occurrences.data, t.brand, t.success]);

  return (
    <Screen scroll={false} padding={false}>
      {/* Back bar */}
      <View style={[styles.backBar, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[styles.backTitle, { color: t.ink }]}>{i18n('reminders.timeline')}</Text>
        </TouchableOpacity>
        <View style={[styles.datePill, { backgroundColor: t.bgElev, borderColor: t.border }]}>
          <IconCalendar size={12} color={t.ink3} />
          <Text style={[styles.datePillText, { color: t.ink3 }]}>
            {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Segmented control */}
      <View style={[styles.segmented, { backgroundColor: t.bgElev, marginHorizontal: 20 }]}>
        {(['Day', 'Week'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={[styles.segTab, view === v && { backgroundColor: t.card, ...shadowStyle }]}
          >
            <Text style={[styles.segTabText, { color: view === v ? t.ink : t.ink3, fontWeight: view === v ? '600' : '400' }]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {occurrences.isLoading && <ApiState title={i18n('api.loading')} loading />}
      {occurrences.error && (
        <ApiState title={i18n('api.unavailable')} message={occurrences.error.message} actionLabel={i18n('common.retry')} onAction={occurrences.reload} />
      )}

      {view === 'Day' ? (
        <ScrollView contentContainerStyle={styles.dayContent} showsVerticalScrollIndicator={false}>
          {HOURS.map((hour) => {
            const eventsAtHour = dayEvents.filter((e) => new Date(e.scheduled_at).getHours() === hour);
            const event  = eventsAtHour[0];
            const isNow  = hour === nowHour;
            const color  = event ? catColor(t, event.type) : t.border;
            const isDone = event?.status === 'done';

            return (
              <View key={hour} style={styles.hourRow}>
                {/* Time label */}
                <Text style={[styles.hourLabel, { color: isNow ? t.brand : t.ink4 }]}>
                  {fmtHour(hour)}
                </Text>

                {/* Spine column */}
                <View style={styles.spineCol}>
                  {/* Vertical spine line */}
                  <View style={[styles.spineLine, { backgroundColor: t.border }]} />

                  {/* Status dot */}
                  <View style={[
                    styles.dot,
                    {
                      backgroundColor: event ? (isDone ? t.success : color) : t.bgElev,
                      borderColor:     event ? (isDone ? t.success : color) : t.border,
                    },
                  ]}>
                    {/* Due halo */}
                    {event && !isDone && (
                      <View style={[styles.dotHalo, { backgroundColor: `${color}20` }]} />
                    )}
                  </View>
                </View>

                {/* Content area */}
                <View style={styles.eventArea}>
                  {/* NOW rule */}
                  {isNow && (
                    <View style={[styles.nowRule, { backgroundColor: `${t.brand}60` }]}>
                      <View style={[styles.nowDot, { backgroundColor: t.brand }]} />
                    </View>
                  )}

                  {event ? (
                    <View style={[
                      styles.eventCard,
                      {
                        backgroundColor: isDone ? t.bgElev : `${color}10`,
                        borderColor:     isDone ? t.border : `${color}30`,
                      },
                    ]}>
                      <View style={[styles.eventIconCell, { backgroundColor: `${color}18`, borderRadius: 8 }]}>
                        <EventIcon type={event.type} color={color} />
                      </View>
                      <View style={styles.eventText}>
                        <Text style={[styles.eventTitle, { color: isDone ? t.ink3 : t.ink, textDecorationLine: isDone ? 'line-through' : 'none' }]}
                          numberOfLines={1}>
                          {event.title}
                        </Text>
                        {eventsAtHour.length > 1 && (
                          <Text style={[styles.eventMore, { color }]}>+{eventsAtHour.length - 1} more</Text>
                        )}
                      </View>
                      {isDone && (
                        <View style={[styles.doneTag, { backgroundColor: `${t.success}15` }]}>
                          <Text style={[styles.doneTagText, { color: t.success }]}>✓</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptySlot} />
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.weekContent} showsVerticalScrollIndicator={false}>
          {/* Week circles */}
          <View style={styles.weekGrid}>
            {weekData.map((day) => (
              <View key={day.day} style={styles.weekCol}>
                <Text style={[styles.weekDayLabel, { color: t.ink3 }]}>{day.day}</Text>
                <View style={[
                  styles.weekCircle,
                  {
                    borderColor:     day.pct === 100 ? t.success : day.pct > 0 ? t.brand : t.border,
                    backgroundColor: day.pct === 100 ? `${t.success}20` : 'transparent',
                  },
                ]}>
                  <Text style={[styles.weekPct, { color: day.pct === 100 ? t.success : t.ink3 }]}>
                    {day.total > 0 ? `${day.pct}%` : '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Category breakdown */}
          <View style={[styles.breakdown, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.breakdownTitle, { color: t.ink }]}>Category breakdown</Text>
            {categoryBreakdown.map((row) => (
              <View key={row.label} style={styles.breakRow}>
                <Text style={[styles.breakLabel, { color: t.ink3 }]}>{row.label}</Text>
                <View style={[styles.breakBar, { backgroundColor: t.bgElev }]}>
                  <View style={[styles.breakFill, { backgroundColor: row.color, width: `${row.pct}%` as any }]} />
                </View>
                <Text style={[styles.breakPct, { color: row.color }]}>{row.pct}%</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const shadowStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

const DOT_SIZE    = 10;
const HALO_SIZE   = 18;

const styles = StyleSheet.create({
  // back bar
  backBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTitle: { ...typography.h3 },
  datePill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  datePillText: { ...typography.caption },

  // segmented
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: 12 },
  segTab:    { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segTabText:{ ...typography.body },

  // day timeline
  dayContent: { paddingLeft: 20 },
  hourRow:    { flexDirection: 'row', alignItems: 'flex-start', minHeight: 52 },
  hourLabel:  { ...typography.micro, ...tabularNums, fontWeight: '600' as const, width: 38, marginTop: 10, textAlign: 'right' as const },

  // spine column
  spineCol:  { width: 28, alignItems: 'center', position: 'relative' },
  spineLine: { position: 'absolute', top: 0, bottom: 0, width: 2, left: 13 },
  dot: {
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    borderWidth: 2, marginTop: 8, zIndex: 1,
  },
  dotHalo: {
    position: 'absolute',
    width: HALO_SIZE, height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    top: -(HALO_SIZE - DOT_SIZE) / 2,
    left: -(HALO_SIZE - DOT_SIZE) / 2,
    zIndex: 0,
  },

  // event area
  eventArea:  { flex: 1, paddingRight: 20, paddingTop: 4, paddingBottom: 4 },
  nowRule:    { height: 1.5, width: '100%', marginBottom: 4, position: 'relative' },
  nowDot:     { width: 6, height: 6, borderRadius: 3, position: 'absolute', left: -3, top: -2 },
  emptySlot:  { height: 44 },

  eventCard:   { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 8, gap: 8 },
  eventIconCell: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  eventText:   { flex: 1 },
  eventTitle:  { ...typography.caption, fontWeight: '600' as const },
  eventMore:   { ...typography.micro, marginTop: 2 },
  doneTag:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  doneTagText: { ...typography.micro, fontWeight: '700' as const },

  // week view
  weekContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  weekGrid:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  weekCol:     { alignItems: 'center', gap: 6 },
  weekDayLabel:{ ...typography.micro, fontWeight: '600' as const },
  weekCircle:  { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  weekPct:     { ...typography.micro, fontWeight: '700' as const },

  breakdown:      { padding: 16, borderRadius: 14, borderWidth: 1 },
  breakdownTitle: { ...typography.bodyMed, marginBottom: 12 },
  breakRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  breakLabel:     { width: 90, ...typography.bodyMed },
  breakBar:       { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  breakFill:      { height: '100%', borderRadius: 3 },
  breakPct:       { width: 36, textAlign: 'right' as const, ...typography.bodyMed },
});
