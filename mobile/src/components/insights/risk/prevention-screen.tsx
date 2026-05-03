// Prevention plan screen — actionable steps for cardiovascular risk reduction
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { SectionHeader } from '../../layout/SectionHeader';
import { Card } from '../../primitives/Card';
import { ProgressRing } from '../../charts/ProgressRing';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft, IconBell, IconCheck, IconAlert, IconTarget, IconLeaf, IconActivity, IconHeart, IconShield } from '../../../icons';

// ─── BackBar ──────────────────────────────────────────────────────────────────

function BackBar({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

// ─── Action item data ─────────────────────────────────────────────────────────

type Priority = 'HIGH' | 'MED' | 'LOW';
type ActionStatus = 'active' | 'pending';

interface ActionItem {
  id: string;
  priority: Priority;
  title: string;
  detail: string;
  status: ActionStatus;
  icon: React.ReactNode;
}

// ─── Action card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  item: ActionItem;
  started: boolean;
  onToggle: () => void;
}

function ActionCard({ item, started, onToggle }: ActionCardProps) {
  const t = useTheme();
  const priorityColor = item.priority === 'HIGH' ? t.warning : item.priority === 'MED' ? t.brand : t.success;
  const cardBg = started ? t.success + '08' : t.card;
  const cardBorder = started ? t.success + '30' : t.border;

  return (
    <View style={[styles.actionCard, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: t.radius.lg }]}>
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconWrap, { backgroundColor: priorityColor + '18', borderRadius: t.radius.sm }]}>
          {item.icon}
        </View>
        <View style={styles.actionTitles}>
          <View style={styles.actionTitleRow}>
            <View style={[styles.priorityPill, { backgroundColor: priorityColor + '18', borderRadius: t.radius.pill }]}>
              <Text style={[typography.micro, { color: priorityColor, letterSpacing: 0.8 }]}>{item.priority}</Text>
            </View>
            {started && (
              <View style={[styles.startedBadge, { backgroundColor: t.success + '18', borderRadius: t.radius.pill }]}>
                <IconCheck size={10} color={t.success} />
                <Text style={[typography.micro, { color: t.success, marginLeft: 3 }]}>Started</Text>
              </View>
            )}
          </View>
          <Text style={[typography.bodyMed, { color: t.ink, marginTop: 4 }]}>{item.title}</Text>
        </View>
      </View>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 8, marginBottom: 12 }]}>{item.detail}</Text>
      <View style={styles.actionButtons}>
        <Pressable
          onPress={() => {}}
          style={[styles.actionBtn, { backgroundColor: t.brandSoft, borderRadius: t.radius.pill }]}
        >
          <IconBell size={14} color={t.brand} />
          <Text style={[typography.chip, { color: t.brand, marginLeft: 5 }]}>Set reminder</Text>
        </Pressable>
        <Pressable
          onPress={onToggle}
          style={[
            styles.actionBtn,
            { borderRadius: t.radius.pill },
            started
              ? { backgroundColor: t.success + '18' }
              : { backgroundColor: t.brand, },
          ]}
        >
          {started
            ? <IconCheck size={14} color={t.success} />
            : <IconTarget size={14} color="#fff" />
          }
          <Text style={[
            typography.chip,
            { marginLeft: 5, color: started ? t.success : '#fff' },
          ]}>
            {started ? 'In progress' : 'Mark started'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Stub data ────────────────────────────────────────────────────────────────

const INITIAL_ACTIONS: ActionItem[] = [
  { id: '1', priority: 'HIGH', title: 'Reduce sodium intake',    detail: 'Target < 2,300 mg/day. Swap processed snacks for whole foods.',      status: 'active',  icon: <IconLeaf     size={16} color="#D97706" /> },
  { id: '2', priority: 'HIGH', title: 'Daily 20-min walk',       detail: 'Low-impact cardio improves BP and lowers cardiovascular risk.',        status: 'active',  icon: <IconActivity size={16} color="#D97706" /> },
  { id: '3', priority: 'MED',  title: 'Check BP twice weekly',   detail: 'Log morning readings before medication to track trends accurately.',   status: 'active',  icon: <IconHeart    size={16} color="#3B82F6" /> },
  { id: '4', priority: 'MED',  title: 'Mediterranean diet basics', detail: 'Add olive oil, legumes, fish × 2/week. Reduce red meat.',            status: 'pending', icon: <IconLeaf     size={16} color="#3B82F6" /> },
  { id: '5', priority: 'MED',  title: 'Limit alcohol to 1/week', detail: 'Excess alcohol raises BP and disrupts sleep quality.',                  status: 'pending', icon: <IconAlert    size={16} color="#3B82F6" /> },
  { id: '6', priority: 'LOW',  title: 'Stress management app',   detail: 'Guided breathing or meditation can reduce resting heart rate.',         status: 'pending', icon: <IconShield   size={16} color="#059669" /> },
  { id: '7', priority: 'LOW',  title: 'Annual cardio checkup',   detail: 'Schedule a lipid panel + ECG with your cardiologist.',                  status: 'pending', icon: <IconTarget   size={16} color="#059669" /> },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export function PreventionScreen() {
  const t = useTheme();
  const [startedIds, setStartedIds] = useState<Set<string>>(
    new Set(INITIAL_ACTIONS.filter((a) => a.status === 'active').map((a) => a.id))
  );

  const toggle = (id: string) =>
    setStartedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const startedCount = startedIds.size;
  const total = INITIAL_ACTIONS.length;
  const progress = startedCount / total;

  return (
    <Screen>
      <BackBar title="Prevention plan" />

      {/* Progress summary */}
      <Card style={styles.progressCard}>
        <View style={styles.progressRow}>
          <ProgressRing value={progress} size={64} stroke={6} color={t.brand} track={t.brandSoft}>
            <Text style={[typography.chip, { color: t.brand }]}>{startedCount}/{total}</Text>
          </ProgressRing>
          <View style={styles.progressText}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>
              {startedCount} of {total} actions started
            </Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
              Keep going — consistency reduces your risk score.
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Actions" />

      <View style={styles.cardList}>
        {INITIAL_ACTIONS.map((item) => (
          <ActionCard
            key={item.id}
            item={item}
            started={startedIds.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  backBtn:       { width: 40, alignItems: 'flex-start' },
  progressCard:  { marginTop: 4 },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progressText:  { flex: 1 },
  cardList:      { gap: 12 },
  actionCard:    { padding: 14, borderWidth: StyleSheet.hairlineWidth },
  actionHeader:  { flexDirection: 'row', gap: 12 },
  actionIconWrap:{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actionTitles:  { flex: 1 },
  actionTitleRow:{ flexDirection: 'row', gap: 6, alignItems: 'center' },
  priorityPill:  { paddingHorizontal: 7, paddingVertical: 3 },
  startedBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
});
