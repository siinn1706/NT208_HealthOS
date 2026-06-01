export type PreventionCategory = 'Cardiovascular' | 'Nutrition' | 'Activity' | 'Stress';
export type PreventionPriority = 'HIGH' | 'MED' | 'LOW';

export interface PreventionAction {
  id: string;
  category: PreventionCategory;
  priority: PreventionPriority;
  title: string;
  detail: string;
  duration: string;
  benefit: string;
  effort: 1 | 2 | 3;
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

function humanize(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function categoryForText(value: string): PreventionCategory {
  const lower = value.toLowerCase();
  if (lower.includes('step') || lower.includes('activity') || lower.includes('walk')) return 'Activity';
  if (lower.includes('diet') || lower.includes('sodium') || lower.includes('nutrition') || lower.includes('weight') || lower.includes('bmi')) return 'Nutrition';
  if (lower.includes('sleep') || lower.includes('stress') || lower.includes('alcohol')) return 'Stress';
  return 'Cardiovascular';
}

function priorityFrom(value: unknown): PreventionPriority {
  const raw = asString(value, 'medium').toLowerCase();
  if (raw === 'high') return 'HIGH';
  if (raw === 'low') return 'LOW';
  return 'MED';
}

export function riskTipsToActions(payload: unknown): PreventionAction[] {
  const risks = asArray(asRecord(payload).risks).map(asRecord);
  return risks.flatMap((risk, riskIndex) => {
    const condition = humanize(asString(risk.condition, 'Risk'));
    const level = humanize(asString(risk.level, 'unknown'));
    const probability = Math.round(asNumber(risk.probability) * 100);
    const tips = asArray(risk.tips).map(asRecord);
    return tips.map((tip, tipIndex) => {
      const title = humanize(asString(tip.title, 'Prevention action'));
      const detail = humanize(asString(tip.description, 'No action detail returned by Core.'));
      const category = categoryForText(`${condition} ${title} ${detail}`);
      const priority = priorityFrom(tip.priority);
      const riskId = asString(risk.id, `risk-${riskIndex}`);
      const tipId = asString(tip.id);
      return {
        id: tipId || `${riskId}-${tipIndex}`,
        category,
        priority,
        title,
        detail,
        duration: 'Core recommendation',
        benefit: `${level} · ${probability}%`,
        effort: priority === 'LOW' ? 1 : 2,
      };
    });
  });
}
