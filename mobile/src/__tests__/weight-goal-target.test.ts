/* eslint-env jest */
import { parseWeightGoalTarget } from '../components/insights/goals/weight-goal-target';

describe('parseWeightGoalTarget', () => {
  it('accepts backend-supported weight goals', () => {
    expect(parseWeightGoalTarget('30')).toBe(30);
    expect(parseWeightGoalTarget('72.5')).toBe(72.5);
    expect(parseWeightGoalTarget('70,5')).toBe(70.5);
    expect(parseWeightGoalTarget('200')).toBe(200);
  });

  it('rejects values outside the Core health-goal contract', () => {
    expect(parseWeightGoalTarget('')).toBeNull();
    expect(parseWeightGoalTarget('29.9')).toBeNull();
    expect(parseWeightGoalTarget('200.1')).toBeNull();
    expect(parseWeightGoalTarget('70kg')).toBeNull();
    expect(parseWeightGoalTarget('1e2')).toBeNull();
    expect(parseWeightGoalTarget('0x46')).toBeNull();
    expect(parseWeightGoalTarget('70.555')).toBeNull();
  });
});
