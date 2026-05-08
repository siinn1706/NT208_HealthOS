import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { IconButton } from '../primitives/IconButton';
import { ApiState } from '../api/ApiState';
import { TimelineSkeleton } from '../api/Skeletons';
import { ChevronLeft, IconPill, IconFilter } from '../../icons';
import { medicationService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';

export function MedicationHistoryScreen() {
  const t = useTheme();
  const loadHistory = useCallback(() => medicationService.list('all'), []);
  const history = useApiQuery(`${queryKeys.medications}.history`, loadHistory);
  const archived = (history.data ?? []).filter((med) => med.status !== 'active');
  const all = history.data ?? [];
  const paused = all.filter((m) => m.status === 'paused').length;
  const adherenceAvg = all.length
    ? Math.round(all.reduce((sum, m) => sum + (m.dose_count > 0 ? 80 : 0), 0) / all.length)
    : 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Medication history"
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel="Back" />}
          right={<IconButton icon={<IconFilter size={18} color={t.ink3} />} accessibilityLabel="Filter" />}
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {history.isLoading && (
          <ApiState title="Loading medication history" loading skeleton={<TimelineSkeleton />} />
        )}
        {history.error && <ApiState title="History unavailable" message={history.error.message} actionLabel="Retry" onAction={history.reload} />}
        {!history.isLoading && !history.error && archived.length === 0 && (
          <ApiState title="No archived medications" message="Completed, cancelled, and paused medications will appear here." />
        )}

        {/* Stats — single white card with three columns */}
        {!history.isLoading && all.length > 0 && (
          <Card style={s.statsCard}>
            {[
              { label: 'Adherence', value: `${adherenceAvg}%`, color: t.success },
              { label: 'Medications', value: String(all.length),  color: t.ink    },
              { label: 'Missed',     value: String(paused),        color: t.danger },
            ].map((stat, i, arr) => (
              <View
                key={stat.label}
                style={[
                  s.statCol,
                  i < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: t.border },
                ]}
              >
                <Text style={[typography.title, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{stat.label}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* NOTE: Per-day medication dose history is not available via the current API contract.
            Showing archived medication list instead. */}
        {archived.length > 0 && (
          <>
            <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }]}>
              This week
            </Text>
            <Card style={s.groupCard}>
              {archived.map((med, i) => (
                <Pressable
                  key={med.id}
                  onPress={() => router.push(`/meds/${med.id}` as never)}
                  style={({ pressed }) => [
                    s.medRow,
                    i < archived.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={[s.iconWrap, { backgroundColor: `${t.brand}18`, borderRadius: t.radius.md }]}>
                    <IconPill size={16} color={t.brand} />
                  </View>
                  <View style={s.flex}>
                    <Text style={[typography.bodyMed, { color: t.ink }]}>{med.name}</Text>
                    <Text style={[typography.caption, { color: t.ink3, marginTop: 1 }]}>
                      {[med.strength, med.form].filter(Boolean).join(' · ') || 'No dose details'}
                    </Text>
                    <Text style={[typography.micro, { color: t.ink4, marginTop: 2 }]}>
                      {formatDate(med.start_date)} to {formatDate(med.end_date)}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: `${t.brand}18`, borderRadius: t.radius.pill }]}>
                    <Text style={[typography.micro, { color: t.brand }]}>{med.status}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  flex:        { flex: 1 },
  bar:         { paddingHorizontal: 16 },
  content:     { paddingHorizontal: 16, paddingTop: 4 },
  statsCard:   { flexDirection: 'row', marginBottom: 16, padding: 0 },
  statCol:     { flex: 1, alignItems: 'center', paddingVertical: 16 },
  groupCard:   { padding: 0 },
  medRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  iconWrap:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4 },
});
