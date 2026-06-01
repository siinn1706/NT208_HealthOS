/* eslint-env jest */
import {
  PREVENTION_PLAN_CATEGORY,
  actionToPreventionPlanItem,
  findActivePreventionPlan,
  hasTrackedPreventionAction,
  mergePreventionPlanItem,
} from '../components/insights/risk/prevention-plan-items';

const action = {
  id: 'risk-hypertension-0',
  category: 'Nutrition' as const,
  priority: 'HIGH' as const,
  title: 'Reduce Sodium',
  detail: 'Choose low salt meals',
  duration: 'Core recommendation',
  benefit: 'High · 62%',
  effort: 2 as const,
};

const plan = {
  id: 'plan-1',
  user_id: 'user-1',
  title: 'Prevention plan',
  category: PREVENTION_PLAN_CATEGORY,
  description: null,
  start_date: null,
  end_date: null,
  status: 'active',
  items: [actionToPreventionPlanItem(action, '2026-06-01T00:00:00.000Z')],
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
  archived_at: null,
};

describe('prevention plan item helpers', () => {
  it('maps Core risk actions to generic plan items', () => {
    expect(actionToPreventionPlanItem(action, '2026-06-01T00:00:00.000Z')).toMatchObject({
      id: 'risk-hypertension-0',
      source: 'risk_prediction_tip',
      title: 'Reduce Sodium',
      status: 'started',
      tracked_at: '2026-06-01T00:00:00.000Z',
    });
  });

  it('finds the active prevention plan only', () => {
    expect(findActivePreventionPlan([
      { ...plan, id: 'wrong', category: 'other' },
      { ...plan, id: 'archived', archived_at: '2026-06-01T00:00:00.000Z' },
      plan,
    ])?.id).toBe('plan-1');
  });

  it('detects and merges tracked actions by id', () => {
    expect(hasTrackedPreventionAction(plan, action.id)).toBe(true);
    const next = actionToPreventionPlanItem({ ...action, title: 'Updated Sodium' }, '2026-06-02T00:00:00.000Z');
    const merged = mergePreventionPlanItem(plan.items, next);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ title: 'Updated Sodium', tracked_at: '2026-06-02T00:00:00.000Z' });
  });
});
