import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { Card } from '../../primitives/card';
import { SectionHeader } from '../../layout/section-header';
import { ApiState, MissingApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { useThemeContext } from '../../../theme/theme-provider';
import { typography } from '../../../theme/typography';
import { ChevronLeft, IconFire } from '../../../icons';

// Heatmap config
const DAY_LABELS  = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5'];
const TOTAL_CELLS = WEEK_LABELS.length * DAY_LABELS.length; // 35

export function GoalStreaksScreen() {
  const t    = useTheme();
  const { t: i18n } = useTranslation();
  const { name: themeName } = useThemeContext();
  const isNight = themeName === 'night';

  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);

  if (goal.isLoading) {
    return (
      <Screen>
        <ApiState title={i18n('insights.loadingStreaks')} loading />
      </Screen>
    );
  }

  if (goal.error) {
    return (
      <Screen>
        <ApiState title={i18n('insights.streaksUnavailable')} message={goal.error.message} actionLabel={i18n('common.retry')} onAction={goal.reload} />
      </Screen>
    );
  }

  // Heatmap colors per theme
  const cellEmpty  = isNight ? 'rgba(91,168,200,0.10)' : '#DCEFF7';
  const cellFilled = isNight ? '#5BA8C8'                : '#1965B3';
  const cellSoft   = isNight ? 'rgba(91,168,200,0.30)'  : '#B8D9EA';

  // Hero gradient — warm peach-gold both themes
  const heroColors: [string, string] = ['#E8C99A', '#D4A06A'];

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backBar}>
        <ChevronLeft size={20} color={t.ink} />
        <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>{i18n('insights.streaks')}</Text>
      </Pressable>

      {/* Hero */}
      <LinearGradient
        colors={heroColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: t.radius.xl }]}
      >
        <Text style={styles.fireEmoji}>🔥</Text>
        <Text style={styles.streakCount}>{goal.data ? '0' : '--'}</Text>
        <Text style={[typography.micro, { color: '#7A5020', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }]}>
          DAY STREAK
        </Text>
        <Text style={[typography.caption, { color: '#8B5E30', marginTop: 6 }]}>
          Best ever · 2 to break your record
        </Text>
      </LinearGradient>

      {/* Last 5 weeks heatmap */}
      <SectionHeader title={i18n('insights.last5Weeks')} />
      <Card style={styles.heatmapCard}>
        {/* Day labels row */}
        <View style={styles.heatmapHeader}>
          <View style={styles.weekLabelCell} />
          {DAY_LABELS.map((d, i) => (
            <View key={i} style={styles.heatCell}>
              <Text style={[typography.micro, { color: t.ink3 }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Grid rows */}
        {WEEK_LABELS.map((wk, wi) => (
          <View key={wi} style={styles.heatRow}>
            <View style={styles.weekLabelCell}>
              <Text style={[typography.micro, { color: t.ink4 }]}>{wk}</Text>
            </View>
            {DAY_LABELS.map((_, di) => {
              const isToday = wi === WEEK_LABELS.length - 1 && di === new Date().getDay() - 1;
              return (
                <View
                  key={di}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: cellEmpty,
                      borderRadius: 6,
                      borderWidth: isToday ? 1.5 : 0,
                      borderColor: isToday ? cellFilled : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={[typography.micro, { color: t.ink4 }]}>Less</Text>
          {[cellEmpty, cellSoft, cellFilled].map((c, i) => (
            <View key={i} style={[styles.legendDot, { backgroundColor: c, borderRadius: 3 }]} />
          ))}
          <Text style={[typography.micro, { color: t.ink4 }]}>More</Text>
          <View style={[styles.legendDot, { borderRadius: 3, borderWidth: 1.5, borderColor: cellFilled, backgroundColor: 'transparent' }]} />
          <Text style={[typography.micro, { color: t.ink4 }]}>Today</Text>
        </View>

        {/* Data contract note */}
        <MissingApiState
          title="Streak calendar data unavailable"
          contract="TODO: GET /v1/health-goals/{id}/streaks?period=month"
        />
      </Card>

      {/* By goal */}
      <SectionHeader title={i18n('insights.byGoal')} />
      <Card tight>
        {[
          { emoji: '🎯', label: goal.data ? (goal.data as any).category ?? 'Active goal' : 'Goal 1' },
          { emoji: '💊', label: 'Medication' },
        ].map((row, i) => (
          <View
            key={i}
            style={[
              styles.goalRow,
              { borderBottomColor: t.border, borderBottomWidth: i === 0 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <View style={[styles.goalIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
              <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
            </View>
            <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{row.label}</Text>
            <View style={[styles.fireBadge, { backgroundColor: t.warningSoft, borderRadius: t.radius.pill }]}>
              <Text style={{ fontSize: 12 }}>🔥</Text>
              <Text style={[typography.chip, { color: t.warning, marginLeft: 3 }]}>-- d</Text>
            </View>
          </View>
        ))}
        <MissingApiState
          title="Per-goal streak summary unavailable"
          contract="TODO: GET /v1/health-goals/{id}/streaks/summary"
        />
      </Card>
    </Screen>
  );
}

const CELL_SIZE = 32;
const CELL_GAP  = 4;

const styles = StyleSheet.create({
  backBar:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  hero:          { padding: 24, alignItems: 'center', marginTop: 4, marginBottom: 4 },
  fireEmoji:     { fontSize: 56 },
  streakCount:   { fontSize: 64, fontWeight: '800', lineHeight: 72, color: '#5C3210' },
  heatmapCard:   { padding: 14 },
  heatmapHeader: { flexDirection: 'row', marginBottom: 4 },
  heatRow:       { flexDirection: 'row', marginBottom: CELL_GAP },
  weekLabelCell: { width: 24, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 },
  heatCell:      { width: CELL_SIZE, height: CELL_SIZE, marginLeft: CELL_GAP, alignItems: 'center', justifyContent: 'center' },
  legend:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' },
  legendDot:     { width: 12, height: 12 },
  goalRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  goalIcon:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  fireBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
});
