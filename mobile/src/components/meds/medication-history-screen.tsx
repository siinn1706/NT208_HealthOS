import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { TimelineSkeleton } from '../api/skeletons';
import { ChevronLeft, IconPill } from '../../icons';
import { medicationService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';

export function MedicationHistoryScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadHistory = useCallback(() => medicationService.list('all'), []);
  const history = useApiQuery(`${queryKeys.medications}.history`, loadHistory);
  const archived = (history.data ?? []).filter((med) => med.status !== 'active');
  const all = history.data ?? [];
  const paused = all.filter((m) => m.status === 'paused').length;
  const completed = all.filter((m) => m.status === 'completed').length;
  const cancelled = all.filter((m) => m.status === 'cancelled').length;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('meds.medicationHistory')}
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel={i18n('common.back')} />}
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {history.isLoading && (
          <ApiState title={i18n('api.loading')} loading skeleton={<TimelineSkeleton />} />
        )}
        {history.error && <ApiState title={i18n('api.unavailable')} message={history.error.message} actionLabel={i18n('common.retry')} onAction={history.reload} />}
        {!history.isLoading && !history.error && archived.length === 0 && (
          <ApiState title={i18n('meds.archived')} message="Completed, cancelled, and paused medications will appear here." />
        )}

        {/* Stats — single white card with three columns */}
        {!history.isLoading && all.length > 0 && (
          <Card style={s.statsCard}>
            {[
              { label: 'Archived', value: String(archived.length), color: t.ink },
              { label: 'Paused', value: String(paused), color: t.warning },
              { label: 'Completed', value: String(completed), color: t.success },
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
        {!history.isLoading && !history.error && all.length > 0 && (
          <ApiState
            title="Dose history unavailable"
            message={`Core exposes current plan status and aggregate adherence, not a per-day medication history feed. Cancelled plans: ${cancelled}.`}
          />
        )}
        {archived.length > 0 && (
          <>
            <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }]}>
              {i18n('care.thisWeek')}
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
