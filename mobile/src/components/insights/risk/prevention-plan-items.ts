import type { WellnessPlan } from '../../../api/services/plan-service';
import type { PreventionAction } from './prevention-action-derivation';

export const PREVENTION_PLAN_CATEGORY = 'risk_prevention';
export const PREVENTION_PLAN_TITLE = 'Prevention plan';
export const PREVENTION_PLAN_DESCRIPTION = 'Saved from Core risk prediction recommendations.';

export interface PreventionPlanItem extends Record<string, unknown> {
  id: string;
  source: 'risk_prediction_tip';
  title: string;
  detail: string;
  category: string;
  priority: string;
  benefit: string;
  effort: number;
  status: 'started';
  tracked_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isPreventionItem(value: unknown): value is PreventionPlanItem {
  return isRecord(value)
    && value.source === 'risk_prediction_tip'
    && typeof value.id === 'string';
}

export function actionToPreventionPlanItem(action: PreventionAction, trackedAt = new Date().toISOString()): PreventionPlanItem {
  return {
    id: action.id,
    source: 'risk_prediction_tip',
    title: action.title,
    detail: action.detail,
    category: action.category,
    priority: action.priority,
    benefit: action.benefit,
    effort: action.effort,
    status: 'started',
    tracked_at: trackedAt,
  };
}

export function findActivePreventionPlan(plans: WellnessPlan[] | null | undefined): WellnessPlan | null {
  return plans?.find((plan) => (
    plan.category === PREVENTION_PLAN_CATEGORY
    && plan.status === 'active'
    && !plan.archived_at
  )) ?? null;
}

export function hasTrackedPreventionAction(plan: WellnessPlan | null | undefined, actionId: string): boolean {
  return Boolean(plan?.items?.some((item) => isPreventionItem(item) && item.id === actionId && item.status === 'started'));
}

export function mergePreventionPlanItem(
  existingItems: Record<string, unknown>[] | null | undefined,
  nextItem: PreventionPlanItem,
): Record<string, unknown>[] {
  const items = existingItems ?? [];
  const withoutSame = items.filter((item) => !(isPreventionItem(item) && item.id === nextItem.id));
  return [...withoutSame, nextItem];
}
