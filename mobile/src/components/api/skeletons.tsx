import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../primitives/feedback/skeleton';
import { useTheme } from '../../theme/useTheme';

// ─── KPI grid skeleton (4 rings) ──────────────────────────────────────────────

export function KpiGridSkeleton() {
  return (
    <View style={styles.kpiRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.kpiCell}>
          <Skeleton width={56} height={56} radius={28} />
          <Skeleton width={48} height={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

// ─── Chart skeleton ────────────────────────────────────────────────────────────

export function ChartSkeleton() {
  const t = useTheme();
  return (
    <View style={[styles.chart, { backgroundColor: t.bgElev, borderRadius: t.radius.lg }]}>
      <Skeleton width="40%" height={14} radius={6} />
      <Skeleton height={140} radius={t.radius.md} style={{ marginTop: 2 }} />
      <View style={styles.rangeRow}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} width={36} height={24} radius={100} />)}
      </View>
      <View style={styles.statsRow}>
        {[0, 1, 2].map((i) => <Skeleton key={i} height={48} radius={t.radius.md} style={{ flex: 1 }} />)}
      </View>
    </View>
  );
}

// ─── Appointment list skeleton ─────────────────────────────────────────────────

export function ApptListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <Skeleton width={44} height={44} radius={22} />
          <View style={styles.listText}>
            <Skeleton height={14} width="70%" />
            <Skeleton height={11} width="45%" style={{ marginTop: 5 }} />
          </View>
          <Skeleton width={56} height={24} radius={12} />
        </View>
      ))}
    </View>
  );
}

// ─── Medication list skeleton ──────────────────────────────────────────────────

export function MedListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <Skeleton width={40} height={40} radius={20} />
          <View style={styles.listText}>
            <Skeleton height={14} width="60%" />
            <Skeleton height={6} width="100%" style={{ marginTop: 6, borderRadius: 3 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Chat conversation list skeleton ──────────────────────────────────────────

export function ChatListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <Skeleton width={44} height={44} radius={22} />
          <View style={styles.listText}>
            <Skeleton height={13} width="55%" />
            <Skeleton height={11} width="80%" style={{ marginTop: 5 }} />
          </View>
          <Skeleton width={28} height={11} />
        </View>
      ))}
    </View>
  );
}

// ─── Timeline skeleton ─────────────────────────────────────────────────────────

export function TimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.timeline}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.timelineRow}>
          <View style={styles.timelineMeta}>
            <Skeleton width={10} height={10} radius={5} />
            <Skeleton width={50} height={10} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.timelineCard}>
            <Skeleton height={14} width="70%" />
            <Skeleton height={11} width="50%" style={{ marginTop: 5 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow:       { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  kpiCell:      { alignItems: 'center', flex: 1 },
  chart:        { padding: 12, gap: 10, marginVertical: 12 },
  rangeRow:     { flexDirection: 'row', gap: 6 },
  statsRow:     { flexDirection: 'row', gap: 1 },
  list:         { gap: 12, marginVertical: 8 },
  listRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  listText:     { flex: 1 },
  timeline:     { gap: 16, marginVertical: 8 },
  timelineRow:  { flexDirection: 'row', gap: 12 },
  timelineMeta: { width: 60, alignItems: 'center', paddingTop: 2 },
  timelineCard: { flex: 1, backgroundColor: 'transparent', gap: 0 },
});
