import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { SectionHeader } from '../../layout/SectionHeader';
import { Card } from '../../primitives/Card';
import { Button } from '../../primitives/Button';
import { Sparkline } from '../../charts/Sparkline';
import { ApiState, MissingApiState } from '../../api/ApiState';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { riskService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import {
  ChevronLeft, IconMore, IconHeartPulse,
  IconActivity, IconShield, IconLeaf,
} from '../../../icons';

function BackBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      <Text style={[typography.h3, { flex: 1, color: t.ink }]} numberOfLines={1}>{title}</Text>
      {right && <View style={styles.backRight}>{right}</View>}
    </View>
  );
}

type ImpactLevel = 'high' | 'medium' | 'low';

function ImpactChip({ level }: { level: ImpactLevel }) {
  const t = useTheme();
  const map = {
    high: { bg: t.danger + '18', text: t.danger, label: 'High impact' },
    medium: { bg: t.warning + '18', text: t.warning, label: 'Med impact' },
    low: { bg: t.success + '18', text: t.success, label: 'Low impact' },
  };
  const { bg, text, label } = map[level];
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderRadius: t.radius.pill }]}>
      <Text style={[typography.chip, { color: text }]}>{label}</Text>
    </View>
  );
}

function FactorRow({
  icon,
  iconBg,
  name,
  detail,
  impact,
}: {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  detail: string;
  impact: ImpactLevel;
}) {
  const t = useTheme();
  return (
    <View style={[styles.factorRow, { borderBottomColor: t.border }]}>
      <View style={[styles.factorIcon, { backgroundColor: iconBg, borderRadius: t.radius.md }]}>
        {icon}
      </View>
      <View style={styles.factorBody}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{name}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{detail}</Text>
      </View>
      <ImpactChip level={impact} />
    </View>
  );
}

function SuggestionCard({ priority, title, detail }: { priority: 'high' | 'medium' | 'low'; title: string; detail: string }) {
  const t = useTheme();
  const color = priority === 'high' ? t.warning : priority === 'medium' ? t.brand : t.success;
  return (
    <View style={[styles.suggCard, { backgroundColor: color + '10', borderColor: color + '30', borderRadius: t.radius.lg }]}>
      <View style={styles.suggHeader}>
        <View style={[styles.suggPill, { backgroundColor: color + '20', borderRadius: t.radius.pill }]}>
          <Text style={[typography.micro, { color, letterSpacing: 0.8 }]}>{priority.toUpperCase()}</Text>
        </View>
        <Text style={[typography.bodyMed, { color: t.ink, flex: 1, marginLeft: 8 }]}>{title}</Text>
      </View>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 6 }]}>{detail}</Text>
    </View>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function iconForLabel(label: string, color: string) {
  const lower = label.toLowerCase();
  if (lower.includes('bp') || lower.includes('pressure') || lower.includes('heart')) {
    return <IconHeartPulse size={16} color={color} />;
  }
  if (lower.includes('activity') || lower.includes('step')) {
    return <IconActivity size={16} color={color} />;
  }
  if (lower.includes('diet') || lower.includes('sodium') || lower.includes('nutrition')) {
    return <IconLeaf size={16} color={color} />;
  }
  return <IconShield size={16} color={color} />;
}

export function RiskDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;

  const loadRisk = useCallback(() => riskService.summary(), []);
  const risk = useApiQuery(queryKeys.riskSummary, loadRisk);

  const model = useMemo(() => {
    const payload = asRecord(risk.data);
    const rows = asArray(payload.risks).map(asRecord).sort((a, b) => asNumber(b.probability) - asNumber(a.probability));
    const fromNumeric = rawId && /^\d+$/.test(rawId) ? rows[Number(rawId) - 1] : null;
    const fromId = rawId ? rows.find((row) => asString(row.id) === rawId) : null;
    const selected = fromId ?? fromNumeric ?? rows[0] ?? null;
    const notFound = Boolean(rawId) && !fromId && !fromNumeric;

    const factors = selected ? asArray(selected.factors).map(asRecord).map((item) => {
      const impactRaw = asString(item.impact, 'neutral');
      const impact: ImpactLevel = impactRaw === 'negative' ? 'high' : impactRaw === 'positive' ? 'low' : 'medium';
      const label = asString(item.label, 'Factor');
      const detail = asString(item.detail, 'No detail');
      const color = impact === 'high' ? '#E54D4D' : impact === 'medium' ? '#D97706' : '#059669';
      return {
        name: label.replace(/_/g, ' '),
        detail,
        impact,
        icon: iconForLabel(label, color),
        iconBg: color + '18',
      };
    }) : [];

    const suggestions = selected ? asArray(selected.tips).map(asRecord).map((item) => {
      const p = asString(item.priority, 'medium').toLowerCase();
      const priority = p === 'high' || p === 'medium' || p === 'low' ? p : 'medium';
      return {
        priority: priority as 'high' | 'medium' | 'low',
        title: asString(item.title, 'Suggestion').replace(/_/g, ' '),
        detail: asString(item.description, 'No detail').replace(/_/g, ' '),
      };
    }) : [];

    const probability = selected ? clamp(asNumber(selected.probability)) : 0;
    return {
      generatedAt: asString(payload.generatedAt),
      selected,
      notFound,
      factors,
      suggestions,
      probability,
      trendSeries: [Math.round(probability * 100)],
    };
  }, [risk.data, rawId]);

  if (risk.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading risk detail" loading />
      </Screen>
    );
  }

  if (risk.error) {
    return (
      <Screen>
        <ApiState title="Risk detail unavailable" message={risk.error.message} actionLabel="Retry" onAction={risk.reload} />
      </Screen>
    );
  }

  if (model.notFound) {
    return (
      <Screen>
        <ApiState title="Risk item not found" message="Risk id not present in current prediction payload." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  if (!model.selected) {
    return (
      <Screen>
        <ApiState title="No risk data yet" message="No risk entries returned by backend." />
      </Screen>
    );
  }

  const condition = asString(model.selected.condition, 'Risk');
  const level = asString(model.selected.level, 'unknown');

  return (
    <Screen>
      <BackBar
        title={`${condition.toLowerCase()} risk`}
        right={
          <Pressable hitSlop={8} style={styles.moreBtn} onPress={risk.reload}>
            <IconMore size={20} color={t.ink3} />
          </Pressable>
        }
      />

      <Card style={{ ...styles.heroCard, backgroundColor: t.warning + '10', borderColor: t.warning + '30' }}>
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, { backgroundColor: t.warning + '25', borderRadius: t.radius.md }]}>
            <IconHeartPulse size={24} color={t.warning} />
          </View>
          <View style={styles.heroMeta}>
            <View style={[styles.chip, { backgroundColor: t.warning + '18', borderRadius: t.radius.pill, alignSelf: 'flex-start', marginBottom: 6 }]}>
              <Text style={[typography.chip, { color: t.warning }]}>{level}</Text>
            </View>
            <Text style={[typography.caption, { color: t.ink3 }]}>
              {model.generatedAt ? `Updated ${new Date(model.generatedAt).toLocaleString()}` : 'Generated time unavailable'}
            </Text>
          </View>
          <Sparkline data={model.trendSeries} color={t.warning} width={80} height={36} />
        </View>
        <View style={styles.heroScoreRow}>
          <Text style={[typography.display, { color: t.ink }]}>{Math.round(model.probability * 100)}</Text>
          <View style={styles.heroScoreDetail}>
            <Text style={[typography.caption, { color: t.ink3 }]}>Current probability (%)</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Driving factors" />
      {model.factors.length === 0 ? (
        <ApiState title="No factors returned" message="Risk payload has no factor details." />
      ) : (
        <Card tight>
          {model.factors.map((factor, i) => <FactorRow key={`${factor.name}-${i}`} {...factor} />)}
        </Card>
      )}

      <SectionHeader title="What to do" />
      {model.suggestions.length === 0 ? (
        <ApiState title="No suggestions returned" message="Risk payload has no tip details." />
      ) : (
        <View style={styles.suggList}>
          {model.suggestions.map((suggestion, i) => <SuggestionCard key={`${suggestion.title}-${i}`} {...suggestion} />)}
        </View>
      )}

      <SectionHeader title="Track over time" />
      <Card tight style={styles.trackCard}>
        <MissingApiState title="Risk trend history unavailable" contract="TODO: add endpoint GET /v1/health/risk-predictions/{id}/history?period=30d" />
      </Card>

      <Button
        label="Prevention plan"
        variant="solid"
        size="lg"
        style={{ marginTop: 20 }}
        onPress={() => router.push('/insights/risk/prevention' as never)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  backBtn:        { width: 40, alignItems: 'flex-start' },
  backRight:      { flexDirection: 'row', gap: 4 },
  moreBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chip:           { paddingHorizontal: 8, paddingVertical: 3 },
  heroCard:       { marginTop: 4 },
  heroTop:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  heroIcon:       { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  heroMeta:       { flex: 1 },
  heroScoreRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroScoreDetail:{ flex: 1 },
  factorRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  factorIcon:     { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  factorBody:     { flex: 1 },
  suggList:       { gap: 10 },
  suggCard:       { padding: 14, borderWidth: StyleSheet.hairlineWidth },
  suggHeader:     { flexDirection: 'row', alignItems: 'center' },
  suggPill:       { paddingHorizontal: 7, paddingVertical: 3 },
  trackCard:      { overflow: 'hidden' },
});
