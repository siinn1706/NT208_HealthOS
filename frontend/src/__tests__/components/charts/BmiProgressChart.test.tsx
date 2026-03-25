import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BmiProgressChart } from '@/components/charts/BmiProgressChart';
import type { UserBmiData } from '@/data/gamification';

const mockBmiData: UserBmiData = {
  heightCm: 175,
  weightKg: 70,
  bmi: 22.86,
  status: 'normal',
  bmiScore: 85,
  targetBmi: 22.0,
  targetWeightKg: 68,
  deadline: null,
  goalId: null,
};

describe('BmiProgressChart', () => {
  it('renders BMI chart container', () => {
    const { container } = render(
      <BmiProgressChart
        bmiData={mockBmiData}
        historyData={[
          { date: '2026-03-20', bmi: 23.1 },
          { date: '2026-03-21', bmi: 23.0 },
          { date: '2026-03-22', bmi: 22.9 },
        ]}
        height={220}
      />
    );
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });

  it('renders with empty history data without throwing', () => {
    const { container } = render(
      <BmiProgressChart bmiData={mockBmiData} historyData={[]} height={220} />
    );
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });
});
