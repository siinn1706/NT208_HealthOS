import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../layout/screen';
import { Button } from '../../primitives/button';
import { Card } from '../../primitives/card';
import { SectionHeader } from '../../layout/section-header';
import { ApiState, MissingApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService, profileService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ProgressRing } from '../../charts/progress-ring';
import { ChevronLeft, IconMore, IconBell, IconFire } from '../../../icons';

export function GoalDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const loadProfile = useCallback(() => profileService.me(), []);

  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);
  const profile = useApiQuery(queryKeys.profile, loadProfile);

  if (goal.isLoading || profile.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading goal" loading />
      </Screen>
    );
  }

  if (goal.error || profile.error) {
    return (
      <Screen>
        <ApiState title="Goal unavailable" message={goal.error?.message ?? profile.error?.message} actionLabel="Retry" onAction={() => { goal.reload(); profile.reload(); }} />
      </Screen>
    );
  }

  if (!goal.data) {
    return (
      <Screen>
        <ApiState title="No goal configured" message="Create a health goal first." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  if (routeId && routeId !== goal.data.id) {
    return (
      <Screen>
        <ApiState title="Goal not found" message="Requested goal id does not match current single-goal contract." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const target = goal.data.target_weight_kg ?? 0;
  const current = profile.data?.weight_kg ?? null;
  const progress = current && target > 0 ? Math.max(0, Math.min(1, target / current)) : 0;
  const remaining = current && target > 0 ? Math.max(0, current - target) : null;
  const totalSteps = current && target > 0 ? Math.round(current * 1000) : 8000;
  const doneSteps  = Math.round(totalSteps * progress);
  const toGo       = totalSteps - doneSteps;

  return (
    <Screen>
      <View style={styles.backBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>Back</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable style={[styles.iconBtn, { borderColor: t.border }]} hitSlop={6}>
            <IconBell size={18} color={t.ink3} />
          </Pressable>
          <Pressable style={[styles.iconBtn, { borderColor: t.border }]} hitSlop={6}>
            <IconMore size={18} color={t.ink3} />
          </Pressable>
        </View>
      </View>

      {/* Hero gradient card */}
      <LinearGradient
        colors={[t.brand, t.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: t.radius.xl }]}
      >
        {/* Decorative halo */}
        <View style={styles.halo} />

        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 4 }]}>
          {current ? `${Math.round(doneSteps).toLocaleString()} / ${totalSteps.toLocaleString()}` : `Target ${Math.round(target)} kg`}
        </Text>

        <ProgressRing
          value={progress}
          size={94}
          stroke={9}
          color="#fff"
          track="rgba(255,255,255,0.25)"
          glow={false}
        >
          <View style={styles.ringCenter}>
            <Text style={[styles.ringMain, { color: '#fff' }]}>
              {remaining !== null ? `${remaining.toFixed(1)}` : '--'}
            </Text>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.75)' }]}>to go</Text>
          </View>
        </ProgressRing>

        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.65)', marginTop: 8, textAlign: 'center' }]}>
          {remaining !== null ? `~${Math.ceil(remaining / 0.07)} min of walking left` : 'Current weight unavailable'}
        </Text>
      </LinearGradient>

      {/* Streak + Best stat cards */}
      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={[typography.h3, { color: t.ink }]}>--</Text>
          <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.5 }]}>STREAK</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>Streak data unavailable</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statEmoji}>🏆</Text>
          <Text style={[typography.h3, { color: t.ink }]}>--</Text>
          <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.5 }]}>BEST</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>Best data unavailable</Text>
        </Card>
      </View>

      <SectionHeader title="This Week" />
      <Card>
        {/* TODO(api): GET /v1/health-goals/{id}/progress?period=7d */}
        <MissingApiState title="Weekly progress chart unavailable" contract="TODO: GET /v1/health-goals/{id}/progress?period=7d" />
      </Card>

      <SectionHeader title="Check-in History" />
      <Card>
        {/* TODO(api): GET /v1/health-goals/{id}/checkins */}
        <MissingApiState title="Check-in history unavailable" contract="TODO: GET /v1/health-goals/{id}/checkins" />
      </Card>

      <View style={styles.footer}>
        <Button label="Log Progress" disabled />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  backBtn:      { flexDirection: 'row', alignItems: 'center' },
  headerActions:{ flexDirection: 'row', gap: 8 },
  iconBtn:      { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  hero:         { padding: 20, alignItems: 'center', marginTop: 4, marginBottom: 4, overflow: 'hidden' },
  halo:         { position: 'absolute', right: -30, bottom: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  ringCenter:   { alignItems: 'center' },
  ringMain:     { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  statRow:      { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4 },
  statCard:     { flex: 1, padding: 14, alignItems: 'flex-start' },
  statEmoji:    { fontSize: 22, marginBottom: 6 },
  footer:       { paddingTop: 16 },
});
