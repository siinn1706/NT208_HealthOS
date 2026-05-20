import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { Screen } from '../layout/screen';
import { ApiState } from '../api/api-state';
import { BottomSheet } from '../primitives/sheet/bottom-sheet';
import { useApiQuery, invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { reminderService } from '../../api/services';
import {
  ChevronLeft, IconMore, IconCheck, IconBell, IconCalendar,
  IconActivity, IconClock, IconAlert, IconX,
} from '../../icons';

// ─── helpers ────────────────────────────────────────────────────────────────

function atStartOfDay(d: Date) { const c = new Date(d); c.setHours(0,0,0,0); return c; }
function atEndOfDay(d: Date)   { const c = new Date(d); c.setHours(23,59,59,999); return c; }

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

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }

type CatType = 'med' | 'appt' | 'activity' | 'care';

function catColor(t: ReturnType<typeof useTheme>, cat: CatType) {
  if (cat === 'appt') return t.brand;
  if (cat === 'activity') return t.success;
  return t.brand;
}

function mapCat(type: string): CatType {
  if (type === 'appointment') return 'appt';
  if (type === 'exercise') return 'activity';
  return 'med';
}

function CatIcon({ cat, color, size = 24 }: { cat: CatType; color: string; size?: number }) {
  switch (cat) {
    case 'appt':     return <IconCalendar size={size} color={color} />;
    case 'activity': return <IconActivity size={size} color={color} />;
    default:         return <IconBell size={size} color={color} />;
  }
}

type SheetType = 'done' | 'snooze' | 'skip' | null;

const SNOOZE_OPTS = [
  { label: '5 min',  minutes: 5 },
  { label: '15 min', minutes: 15, subtitle: 'Until 12:45' },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── main component ──────────────────────────────────────────────────────────

export function ReminderDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const reminderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isMarking, setIsMarking] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [snoozeMins, setSnoozeMins] = useState(15);

  const now = useMemo(() => new Date(), []);
  const historyFrom = useMemo(() => {
    const d = new Date(now); d.setDate(d.getDate() - 6);
    return atStartOfDay(d).toISOString();
  }, [now]);
  const futureTo = useMemo(() => {
    const d = new Date(now); d.setDate(d.getDate() + 7);
    return atEndOfDay(d).toISOString();
  }, [now]);

  const loadReminders   = useCallback(() => reminderService.list(), []);
  const loadOccurrences = useCallback(
    () => reminderService.occurrences({ from: historyFrom, to: futureTo, tzid: 'Asia/Ho_Chi_Minh' }),
    [futureTo, historyFrom],
  );

  const reminders   = useApiQuery(queryKeys.remindersAll, loadReminders, { enabled: Boolean(reminderId) });
  const occurrences = useApiQuery(
    queryKeys.reminderOccurrences(`${historyFrom}:${futureTo}`),
    loadOccurrences,
    { enabled: Boolean(reminderId) },
  );

  const reminder = useMemo(
    () => (reminders.data ?? []).find((item) => item.id === reminderId) ?? null,
    [reminders.data, reminderId],
  );

  const reminderOccurrences = useMemo(
    () => (occurrences.data ?? [])
      .filter((item) => item.reminder_id === reminderId)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [occurrences.data, reminderId],
  );

  const summary = useMemo(() => {
    const historyDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return d;
    });
    const history = historyDays.map((day) => {
      const key = dateKey(day);
      const items = reminderOccurrences.filter((occ) => occ.scheduled_at.startsWith(key));
      const done = items.some((occ) => occ.status === 'done');
      const late = items.some((occ) => occ.status === 'skipped');
      const isDue = key === dateKey(now) && !done && !late;
      return { done, late, isDue };
    });

    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].done) break;
      streak++;
    }

    const past     = reminderOccurrences.filter((occ) => new Date(occ.scheduled_at).getTime() <= now.getTime());
    const doneCount  = past.filter((occ) => occ.status === 'done').length;
    const lateCount  = past.filter((occ) => occ.status === 'skipped').length;
    const missedCount = lateCount;
    const onTimeCount = doneCount;
    const adherence  = past.length ? Math.round((doneCount / past.length) * 100) : 0;
    const nextPending = reminderOccurrences.find(
      (occ) => new Date(occ.scheduled_at).getTime() <= now.getTime() && occ.status !== 'done',
    );
    const nextFuture = reminderOccurrences.find(
      (occ) => new Date(occ.scheduled_at).getTime() > now.getTime(),
    );

    return { history, streak, adherence, missedCount, onTimeCount, lateCount, nextPending, nextFuture };
  }, [now, reminderOccurrences]);

  async function handleMarkDone() {
    if (!reminderId || isMarking) return;
    setIsMarking(true);
    setActiveSheet(null);
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

  async function handleSnooze() {
    if (!reminderId) return;
    setActiveSheet(null);
    await reminderService.snooze(reminderId, { minutes: snoozeMins });
    invalidateApiQuery('reminders.');
    reminders.reload();
  }

  if (!reminderId) {
    return <Screen><ApiState title={i18n('api.unavailable')} message="Missing reminder id in route." actionLabel={i18n('common.back')} onAction={() => router.back()} /></Screen>;
  }
  if (reminders.isLoading) {
    return <Screen><ApiState title={i18n('api.loading')} loading /></Screen>;
  }
  if (reminders.error) {
    return <Screen><ApiState title={i18n('api.unavailable')} message={reminders.error.message} actionLabel={i18n('common.retry')} onAction={reminders.reload} /></Screen>;
  }
  if (!reminder) {
    return <Screen><ApiState title={i18n('api.unavailable')} message="Reminder id not present in current list." actionLabel={i18n('common.back')} onAction={() => router.back()} /></Screen>;
  }

  const cat   = mapCat(reminder.type);
  const color = catColor(t, cat);
  const nextTime = fmtClock(reminder.next_occurrence_at ?? reminder.time);
  const nextRelative = summary.nextFuture
    ? (() => {
        const ms = new Date(summary.nextFuture.scheduled_at).getTime() - now.getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        if (h > 0) return `in ${h}h ${m}m`;
        return `in ${m}m`;
      })()
    : null;

  return (
    <Screen scroll={false} padding={false}>
      {/* Back bar */}
      <View style={[styles.backBar, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
        </TouchableOpacity>
        <View style={styles.backBtns}>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: t.bgElev, borderColor: t.border }]}>
            <IconBell size={16} color={t.ink3} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: t.bgElev, borderColor: t.border }]}>
            <IconMore size={16} color={t.ink3} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero row — icon + text, no card wrapper */}
        <View style={[styles.heroRow, { paddingHorizontal: 20 }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${color}18`, borderRadius: 20 }]}>
            <CatIcon cat={cat} color={color} size={32} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: t.ink }]} numberOfLines={2}>{reminder.title}</Text>
            <Text style={[styles.heroSub, { color: t.ink3 }]}>
              {reminder.repeat ?? 'Once'} · {nextTime}
            </Text>
            <View style={styles.heroChips}>
              <View style={[styles.statusChip, { backgroundColor: `${t.success}18` }]}>
                <View style={[styles.statusDot, { backgroundColor: t.success }]} />
                <Text style={[styles.chipText, { color: t.success }]}>On time</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: `${color}14` }]}>
                <Text style={[styles.chipText, { color }]}>{categoryLabel(reminder.type)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Next reminder card */}
        <View style={[styles.nextCard, { backgroundColor: t.brandSoft, borderColor: `${t.brand}40`, marginHorizontal: 20 }]}>
          <Text style={[styles.nextLabel, { color: t.brand }]}>NEXT REMINDER</Text>
          <View style={styles.nextTimeRow}>
            <Text style={[styles.nextTime, { color: t.ink }]}>{nextTime}</Text>
            {nextRelative && (
              <Text style={[styles.nextRelative, { color: t.ink3 }]}> · {nextRelative}</Text>
            )}
          </View>
          <View style={styles.nextActions}>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: t.brand }]}
              onPress={() => setActiveSheet('done')}
            >
              <IconCheck size={14} color="#fff" />
              <Text style={[styles.nextBtnText, { color: '#fff' }]}>{i18n('common.done')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: t.bgElev, borderColor: t.border, borderWidth: 1 }]}
              onPress={() => setActiveSheet('snooze')}
            >
              <IconClock size={14} color={t.ink3} />
              <Text style={[styles.nextBtnText, { color: t.ink3 }]}>Snooze</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: t.bgElev, borderColor: t.border, borderWidth: 1 }]}
              onPress={() => setActiveSheet('skip')}
            >
              <IconX size={14} color={t.ink3} />
              <Text style={[styles.nextBtnText, { color: t.ink3 }]}>{i18n('meds.missed')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7-day adherence grid */}
        {!occurrences.isLoading && !occurrences.error && (
          <View style={[styles.section, { backgroundColor: t.card, borderColor: t.border, marginHorizontal: 20 }]}>
            <Text style={[styles.sectionTitle, { color: t.ink }]}>Last 7 days</Text>
            <View style={styles.dayGrid}>
              {DAY_LABELS.map((label, idx) => {
                const s = summary.history[idx];
                const bg = s?.done ? t.success : s?.late ? t.warning : s?.isDue ? 'transparent' : t.bgElev;
                const borderColor = s?.isDue ? t.border : 'transparent';
                return (
                  <View key={idx} style={styles.dayCol}>
                    <Text style={[styles.dayLabel, { color: t.ink4 }]}>{label}</Text>
                    <View style={[
                      styles.daySquare,
                      { backgroundColor: bg, borderColor, borderWidth: s?.isDue ? StyleSheet.hairlineWidth : 0,
                        borderStyle: s?.isDue ? 'dashed' : 'solid' },
                    ]}>
                      {s?.done && <IconCheck size={12} color="#fff" />}
                      {s?.late && <Text style={styles.lateText}>L</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
            {/* Stat row */}
            <View style={[styles.statRow, { borderTopColor: t.border }]}>
              {[
                { label: 'Adherence', value: `${summary.adherence}%`, color: t.success },
                { label: 'On time',   value: String(summary.onTimeCount), color: t.brand },
                { label: 'Late',      value: String(summary.lateCount),   color: t.warning },
                { label: 'Missed',    value: String(summary.missedCount),  color: t.danger },
              ].map((s) => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: t.ink3 }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {occurrences.isLoading && <ApiState title={i18n('api.loading')} loading />}
        {occurrences.error && <ApiState title={i18n('api.unavailable')} message={occurrences.error.message} actionLabel={i18n('common.retry')} onAction={occurrences.reload} />}

        {/* Settings group */}
        <Text style={[styles.groupLabel, { color: t.ink, paddingHorizontal: 20 }]}>Settings</Text>
        <View style={[styles.settingsCard, { backgroundColor: t.card, borderColor: t.border, marginHorizontal: 20 }]}>
          {[
            { icon: <IconBell size={16} color={t.brand} />, label: 'Notifications', value: 'Push + sound' },
            { icon: <IconClock size={16} color={t.ink3} />, label: 'Snooze', value: '15, 30 min' },
            { icon: <IconCalendar size={16} color={t.ink3} />, label: 'Repeats', value: reminder.repeat ?? 'Once' },
            { icon: <IconAlert size={16} color={t.ink3} />, label: 'Critical alert', value: 'Off' },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              style={[
                styles.settingsRow,
                i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
              ]}
            >
              <View style={[styles.settingsIconCell, { backgroundColor: `${t.brand}14`, borderRadius: 9 }]}>
                {row.icon}
              </View>
              <Text style={[styles.settingsLabel, { color: t.ink }]}>{row.label}</Text>
              <Text style={[styles.settingsValue, { color: t.ink3 }]}>{row.value}</Text>
              <ChevronLeft size={14} color={t.ink4} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete */}
        <TouchableOpacity style={[styles.deleteBtn, { borderColor: t.danger }]}>
          <Text style={[styles.deleteBtnText, { color: t.danger }]}>Delete Reminder</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Done sheet ── */}
      <BottomSheet visible={activeSheet === 'done'} onClose={() => setActiveSheet(null)} maxHeightRatio={0.45}>
        <View style={[styles.sheetBody, { paddingHorizontal: 20, paddingBottom: 28 }]}>
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetIconCell, { backgroundColor: `${t.success}18` }]}>
              <IconCheck size={22} color={t.success} />
            </View>
            <View style={styles.sheetTitleBlock}>
              <Text style={[styles.sheetTitle, { color: t.ink }]}>Marked done</Text>
              <Text style={[styles.sheetSub, { color: t.ink3 }]}>{reminder.title} · logged now</Text>
            </View>
          </View>
          <View style={[styles.streakCard, { backgroundColor: t.chip }]}>
            <Text style={[styles.streakText, { color: t.ink }]}>🔥 {summary.streak} days on track</Text>
          </View>
          <View style={styles.sheetBtns}>
            <TouchableOpacity style={[styles.sheetBtn, { borderColor: t.border, borderWidth: 1 }]} onPress={() => setActiveSheet(null)}>
              <Text style={[styles.sheetBtnText, { color: t.ink }]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: t.brand }]} onPress={handleMarkDone}>
              <Text style={[styles.sheetBtnText, { color: '#fff' }]}>{i18n('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {/* ── Snooze sheet ── */}
      <BottomSheet visible={activeSheet === 'snooze'} onClose={() => setActiveSheet(null)} maxHeightRatio={0.5}>
        <View style={[styles.sheetBody, { paddingHorizontal: 20, paddingBottom: 28 }]}>
          <Text style={[styles.sheetTitle, { color: t.ink, marginBottom: 16 }]}>Snooze reminder</Text>
          <View style={styles.snoozeGrid}>
            {SNOOZE_OPTS.map((opt) => {
              const selected = snoozeMins === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  onPress={() => setSnoozeMins(opt.minutes)}
                  style={[
                    styles.snoozeTile,
                    {
                      backgroundColor: selected ? t.brandSoft : t.bgElev,
                      borderColor: selected ? t.brand : t.border,
                      borderWidth: selected ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.snoozeTileLabel, { color: selected ? t.brand : t.ink }]}>{opt.label}</Text>
                  {opt.subtitle && selected && (
                    <Text style={[styles.snoozeTileSub, { color: t.ink3 }]}>{opt.subtitle}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {/* Dashed custom tile */}
            <TouchableOpacity
              style={[styles.snoozeTileWide, { borderColor: t.border, borderStyle: 'dashed', borderWidth: 1, backgroundColor: 'transparent' }]}
            >
              <Text style={[styles.snoozeTileLabel, { color: t.ink3 }]}>Custom time</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sheetBtns}>
            <TouchableOpacity style={[styles.sheetBtn, { borderColor: t.border, borderWidth: 1 }]} onPress={() => setActiveSheet(null)}>
              <Text style={[styles.sheetBtnText, { color: t.ink }]}>{i18n('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: t.brand }]} onPress={handleSnooze}>
              <Text style={[styles.sheetBtnText, { color: '#fff' }]}>Snooze</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {/* ── Skip sheet ── */}
      <BottomSheet visible={activeSheet === 'skip'} onClose={() => setActiveSheet(null)} maxHeightRatio={0.45}>
        <View style={[styles.sheetBody, { paddingHorizontal: 20, paddingBottom: 28 }]}>
          <Text style={[styles.sheetTitle, { color: t.ink, marginBottom: 6 }]}>Skip this dose?</Text>
          <Text style={[styles.sheetSub, { color: t.ink3, marginBottom: 16 }]}>
            Logging a skip keeps your adherence history accurate.
          </Text>
          <View style={[styles.guidanceCard, { backgroundColor: t.chip }]}>
            <Text style={[styles.guidanceText, { color: t.ink3 }]}>
              Doctor said skip if side effects occur · consult before skipping multiple doses.
            </Text>
          </View>
          <View style={styles.sheetBtns}>
            <TouchableOpacity style={[styles.sheetBtn, { borderColor: t.border, borderWidth: 1 }]} onPress={() => setActiveSheet(null)}>
              <Text style={[styles.sheetBtnText, { color: t.ink }]}>{i18n('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: `${t.danger}15`, borderColor: t.danger, borderWidth: 1 }]} onPress={() => setActiveSheet(null)}>
              <Text style={[styles.sheetBtnText, { color: t.danger }]}>Skip dose</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingTop: 8, paddingBottom: 16 },

  // back bar
  backBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtns:  { flexDirection: 'row', gap: 8 },
  iconCircle:{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // hero
  heroRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  heroIcon:  { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  heroText:  { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  heroSub:   { fontSize: 13, marginTop: 3 },
  heroChips: { flexDirection: 'row', gap: 6, marginTop: 8 },
  statusChip:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  chipText:  { fontSize: 11, fontWeight: '600' },

  // next reminder card
  nextCard:    { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  nextLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  nextTimeRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  nextTime:    { fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  nextRelative:{ fontSize: 14 },
  nextActions: { flexDirection: 'row', gap: 8 },
  nextBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 38, borderRadius: 10 },
  nextBtnText: { fontSize: 13, fontWeight: '600' },

  // 7-day grid section
  section:      { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  dayGrid:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayCol:       { alignItems: 'center', gap: 4 },
  dayLabel:     { fontSize: 10, fontWeight: '600' },
  daySquare:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lateText:     { fontSize: 12, fontWeight: '700', color: '#fff' },
  statRow:      { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  statItem:     { flex: 1, alignItems: 'center' },
  statValue:    { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel:    { fontSize: 10, marginTop: 2 },

  // settings
  groupLabel:   { fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  settingsCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  settingsRow:  { flexDirection: 'row', alignItems: 'center', padding: 14 },
  settingsIconCell: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingsLabel:{ flex: 1, fontSize: 14, fontWeight: '500' },
  settingsValue:{ fontSize: 13, marginRight: 4 },

  // delete
  deleteBtn:     { marginHorizontal: 20, marginTop: 8, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },

  // sheets
  sheetBody:    {},
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sheetIconCell:{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  sheetTitleBlock: {},
  sheetTitle:   { fontSize: 18, fontWeight: '800' },
  sheetSub:     { fontSize: 12, lineHeight: 18, marginTop: 2 },
  streakCard:   { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  streakText:   { fontSize: 14, fontWeight: '700' },
  guidanceCard: { padding: 12, borderRadius: 10, marginBottom: 16 },
  guidanceText: { fontSize: 12, lineHeight: 18 },
  sheetBtns:    { flexDirection: 'row', gap: 10 },
  sheetBtn:     { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { fontSize: 15, fontWeight: '700' },

  // snooze tiles
  snoozeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  snoozeTile:     { width: '46%', height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  snoozeTileWide: { width: '100%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  snoozeTileLabel:{ fontSize: 14, fontWeight: '700' },
  snoozeTileSub:  { fontSize: 11, marginTop: 2 },
});
