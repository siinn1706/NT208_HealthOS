import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { SectionHeader } from '../../layout/section-header';
import { Card } from '../../primitives/card';
import { Button } from '../../primitives/button';
import { ApiState } from '../../api/api-state';
import { ProgressRing } from '../../charts/progress-ring';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { riskService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { RiskDriverTrendsCard } from './risk-driver-trends-card';
import {
  ChevronLeft, IconRefresh, IconHeartPulse,
  IconActivity, IconShield, IconLeaf,
} from '../../../icons';

// ─── BackBar ──────────────────────────────────────────────────────────────────

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

// ─── Factor row with horizontal progress bar ──────────────────────────────────

type ImpactLevel = 'high' | 'medium' | 'low';

function FactorProgressRow({
  name,
  detail,
  value,
  impact,
  icon,
  iconBg,
}: {
  name: string;
  detail: string;
  value: number; // 0-1
  impact: ImpactLevel;
  icon: React.ReactNode;
  iconBg: string;
}) {
  const t = useTheme();
  const fillColor = impact === 'high' ? t.danger : impact === 'medium' ? t.warning : t.success;
  const impactLabel = impact === 'high' ? 'High' : impact === 'medium' ? 'Mod' : 'Low';

  return (
    <View style={[styles.factorRow, { borderBottomColor: t.border }]}>
      <View style={[styles.factorIcon, { backgroundColor: iconBg, borderRadius: t.radius.md }]}>
        {icon}
      </View>
      <View style={styles.factorBody}>
        <View style={styles.factorTitleRow}>
          <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]} numberOfLines={1}>{name}</Text>
          <View style={[styles.factorChip, { backgroundColor: fillColor + '18', borderRadius: t.radius.pill }]}>
            <Text style={[typography.micro, { color: fillColor }]}>{impactLabel}</Text>
          </View>
        </View>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2, marginBottom: 6 }]}>{detail}</Text>
        {/* Thin progress track */}
        <View style={[styles.factorTrack, { backgroundColor: t.border, borderRadius: t.radius.pill }]}>
          <View style={[styles.factorFill, { backgroundColor: fillColor, width: `${Math.round(value * 100)}%`, borderRadius: t.radius.pill }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function toRiskFactors(selected: Record<string, unknown> | null, t: ReturnType<typeof useTheme>) {
  if (!selected) return [];
  return asArray(selected.factors).reduce<{
    name: string;
    detail: string;
    impact: ImpactLevel;
    value: number;
    icon: React.ReactNode;
    iconBg: string;
  }[]>((rows, value) => {
    const item = asRecord(value);
    const impactRaw = asString(item.impact, 'neutral');
    const impact: ImpactLevel = impactRaw === 'negative' ? 'high' : impactRaw === 'positive' ? 'low' : 'medium';
    const label = asString(item.label, 'Factor');
    const detail = asString(item.detail, 'No detail');
    const color = impact === 'high' ? t.danger : impact === 'medium' ? t.warning : t.success;
    rows.push({
      name: label.replace(/_/g, ' '),
      detail,
      impact,
      value: impact === 'high' ? 0.75 : impact === 'medium' ? 0.45 : 0.2,
      icon: iconForLabel(label, color),
      iconBg: color + '18',
    });
    return rows;
  }, []);
}

function toRiskSuggestions(selected: Record<string, unknown> | null) {
  if (!selected) return [];
  return asArray(selected.tips).reduce<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    detail: string;
  }[]>((rows, value) => {
    const item = asRecord(value);
    const p = asString(item.priority, 'medium').toLowerCase();
    const priority = p === 'high' || p === 'medium' || p === 'low' ? p : 'medium';
    rows.push({
      priority,
      title: asString(item.title, 'Suggestion').replace(/_/g, ' '),
      detail: asString(item.description, 'No detail').replace(/_/g, ' '),
    });
    return rows;
  }, []);
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export function RiskDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
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

    const factors = toRiskFactors(selected, t);
    const suggestions = toRiskSuggestions(selected);

    const probability = selected ? clamp(asNumber(selected.probability)) : 0;
    return {
      generatedAt: asString(payload.generatedAt),
      selected,
      notFound,
      factors,
      suggestions,
      probability,
    };
  }, [risk.data, rawId, t]);

  if (risk.isLoading) {
    return (
      <Screen>
        <ApiState title={i18n('api.loading')} loading />
      </Screen>
    );
  }

  if (risk.error) {
    return (
      <Screen>
        <ApiState title={i18n('api.unavailable')} message={risk.error.message} actionLabel={i18n('common.retry')} onAction={risk.reload} />
      </Screen>
    );
  }

  if (model.notFound) {
    return (
      <Screen>
        <ApiState title="Risk item not found" message="Risk id not present in current prediction payload." actionLabel={i18n('common.back')} onAction={() => router.back()} />
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
  const pct = Math.round(model.probability * 100);
  const isElevated = level.toLowerCase() === 'moderate' || level.toLowerCase() === 'high' || level.toLowerCase() === 'critical';
  const trendColor = isElevated ? t.warning : t.success;
  const heroCardBg = t.warning + '10';
  const heroCardBorder = t.warning + '30';

  return (
    <Screen>
      <BackBar
        title={`${condition} risk`}
        right={
          <Pressable hitSlop={8} style={styles.moreBtn} onPress={risk.reload}>
            <IconRefresh size={20} color={t.ink3} />
          </Pressable>
        }
      />

      {/* Hero card: donut ring left + meta right */}
      <Card style={{ ...styles.heroCard, backgroundColor: heroCardBg, borderColor: heroCardBorder }}>
        <View style={styles.heroTop}>
          {/* Left: donut ring with percent */}
          <ProgressRing value={model.probability} size={96} stroke={9} color={trendColor} track={t.border} glow>
            <View style={styles.ringCenter}>
              <Text style={[typography.h3, { color: t.ink, lineHeight: 20 }]}>{pct}%</Text>
            </View>
          </ProgressRing>

          {/* Right: title + current estimate chip + timestamp */}
          <View style={styles.heroMeta}>
            <Text style={[typography.title, { color: t.ink }]} numberOfLines={3}>{condition} risk</Text>
            <View style={[styles.trendChip, { backgroundColor: trendColor + '18', borderRadius: t.radius.pill, marginTop: 8, alignSelf: 'flex-start' }]}>
              <Text style={[typography.micro, { color: trendColor, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
                {level.toUpperCase()} - CURRENT ESTIMATE
              </Text>
            </View>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 8 }]}>
              {model.generatedAt ? `Updated ${new Date(model.generatedAt).toLocaleString()}` : 'Generated time unavailable'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Driving factors with progress bars */}
      <SectionHeader title={i18n('insights.drivingFactors')} />
      {model.factors.length === 0 ? (
        <ApiState title="No factors returned" message="Risk payload has no factor details." />
      ) : (
        <Card tight>
          {model.factors.map((factor, i) => (
            <FactorProgressRow key={`${factor.name}-${i}`} {...factor} />
          ))}
        </Card>
      )}

      {/* What to do */}
      <SectionHeader title={i18n('insights.ifYouChangeOne')} />
      {model.suggestions.length === 0 ? (
        <ApiState title="No suggestions returned" message="Risk payload has no tip details." />
      ) : (
        <View style={styles.suggList}>
          {model.suggestions.map((s, i) => {
            const color = s.priority === 'high' ? t.warning : s.priority === 'medium' ? t.brand : t.success;
            return (
              <Card key={`${s.title}-${i}`} style={{ backgroundColor: color + '08', borderColor: color + '25' }}>
                <View style={[styles.suggIcon, { backgroundColor: color + '18', borderRadius: t.radius.md }]}>
                  <IconShield size={18} color={color} />
                </View>
                <Text style={[typography.bodyMed, { color: t.ink, marginTop: 8 }]}>{s.title}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>{s.detail}</Text>
              </Card>
            );
          })}
        </View>
      )}

      {/* Track existing risk drivers over time. */}
      <SectionHeader title={i18n('insights.trackOverTime')} />
      <RiskDriverTrendsCard
        riskId={asString(model.selected.id, condition)}
        factors={asArray(model.selected.factors)}
      />

      <Button
        label={i18n('insights.preventionPlan')}
        variant="solid"
        size="lg"
        style={{ marginTop: 20 }}
        onPress={() => router.push('/insights/risk/prevention' as never)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  backBtn:      { width: 40, alignItems: 'flex-start' },
  backRight:    { flexDirection: 'row', gap: 4 },
  moreBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroCard:     { marginTop: 4 },
  heroTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  ringCenter:   { alignItems: 'center' },
  heroMeta:     { flex: 1 },
  trendChip:    { paddingHorizontal: 8, paddingVertical: 4 },
  factorRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  factorIcon:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  factorBody:   { flex: 1 },
  factorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorChip:   { paddingHorizontal: 7, paddingVertical: 2 },
  factorTrack:  { height: 4, width: '100%' },
  factorFill:   { height: 4 },
  suggList:     { gap: 10 },
  suggIcon:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
