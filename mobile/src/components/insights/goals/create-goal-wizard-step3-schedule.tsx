// WizardStep3 — Reminders & tracking step for CreateGoalScreen
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { Card } from '../../primitives/Card';
import { IconTarget, IconActivity, IconBell } from '../../../icons';
import type { Schedule } from './create-goal-wizard-steps';

const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DURATIONS = ['1 wk', '2 wk', '4 wk', '8 wk'];

const TRACKING_SOURCES = [
  { key: 'manual',   label: 'Manual log', sub: 'Enter yourself',  icon: (c: string) => <IconTarget   size={16} color={c} /> },
  { key: 'wearable', label: 'Wearable',   sub: 'Auto from device',icon: (c: string) => <IconActivity size={16} color={c} /> },
];

const REMINDER_ROWS = [
  { time: '08:00', label: 'Morning check-in' },
  { time: '14:00', label: 'Afternoon log'    },
  { time: '21:00', label: 'Evening review'   },
];

export function WizardStep3({
  schedule, days, onSchedule, onDay,
}: {
  schedule: Schedule;
  days: string[];
  onSchedule: (s: Schedule) => void;
  onDay: (d: string) => void;
}) {
  const t = useTheme();
  const [duration, setDuration]       = useState('4 wk');
  const [trackingSource, setTracking] = useState<string>('wearable');

  return (
    <View style={styles.stepBody}>
      <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>
        STEP 3 — SCHEDULE
      </Text>
      <Text style={[typography.display, { color: t.ink, marginBottom: 20, lineHeight: 32 }]}>
        Set reminders{'\n'}& tracking
      </Text>

      {/* Duration chips */}
      <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 8 }]}>Duration</Text>
      <View style={s.chipRow}>
        {DURATIONS.map((d) => {
          const active = duration === d;
          return (
            <Pressable
              key={d}
              onPress={() => setDuration(d)}
              style={[s.durationChip, { backgroundColor: active ? t.brand : t.card, borderColor: active ? t.brand : t.border, borderRadius: t.radius.pill }]}
            >
              <Text style={[typography.bodyMed, { color: active ? '#fff' : t.ink3 }]}>{d}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Start date field */}
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 18, marginBottom: 8 }]}>Start date</Text>
      <View style={[s.dateField, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.md }]}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>Today — {new Date().toLocaleDateString()}</Text>
        <IconTarget size={16} color={t.ink4} />
      </View>

      {/* Reminders grouped list */}
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 18, marginBottom: 8 }]}>Reminders</Text>
      <Card tight>
        {REMINDER_ROWS.map((row, i) => (
          <View
            key={i}
            style={[s.reminderRow, { borderBottomColor: t.border, borderBottomWidth: i < REMINDER_ROWS.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
          >
            <View style={[s.reminderIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
              <IconBell size={14} color={t.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{row.label}</Text>
            </View>
            <Text style={[typography.bodyMed, { color: t.brand }]}>{row.time}</Text>
            <Text style={[typography.caption, { color: t.ink4, marginLeft: 8 }]}>···</Text>
          </View>
        ))}
      </Card>

      {/* Tracking source — 2-col cards */}
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 18, marginBottom: 8 }]}>Tracking source</Text>
      <View style={s.sourceGrid}>
        {TRACKING_SOURCES.map((src) => {
          const active = trackingSource === src.key;
          const iconColor = active ? t.brand : t.ink3;
          return (
            <Pressable
              key={src.key}
              onPress={() => setTracking(src.key)}
              style={[s.sourceCard, { borderColor: active ? t.brand : t.border, borderWidth: active ? 2 : StyleSheet.hairlineWidth, backgroundColor: active ? t.brandSoft : t.card, borderRadius: t.radius.lg }]}
            >
              <View style={[s.sourceIcon, { backgroundColor: iconColor + '18', borderRadius: t.radius.sm }]}>
                {src.icon(iconColor)}
              </View>
              <Text style={[typography.bodyMed, { color: active ? t.brand : t.ink, marginTop: 8 }]}>{src.label}</Text>
              <Text style={[typography.caption, { color: t.ink4, marginTop: 2 }]}>{src.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Day chips — only shown when Specific frequency selected */}
      {schedule === 'Specific' && (
        <View style={s.daysRow}>
          {DAYS.map((d) => {
            const sel = days.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => onDay(d)}
                style={[s.dayChip, { backgroundColor: sel ? t.brand : t.card, borderColor: sel ? t.brand : t.border, borderRadius: t.radius.pill }]}
              >
                <Text style={[typography.chip, { color: sel ? '#fff' : t.ink3 }]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ stepBody: { flex: 1 } });

const s = StyleSheet.create({
  chipRow:      { flexDirection: 'row', gap: 8 },
  durationChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth },
  dateField:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderWidth: StyleSheet.hairlineWidth },
  reminderRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  reminderIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sourceGrid:   { flexDirection: 'row', gap: 10 },
  sourceCard:   { flex: 1, padding: 14, alignItems: 'flex-start' },
  sourceIcon:   { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  daysRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  dayChip:      { paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
});
