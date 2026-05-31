import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BmiProgressChart } from '@/components/charts/BmiProgressChart';
import { IntlWrapper } from '@/__tests__/test-utils';
import type { UserBmiData } from '@/data/gamification';

vi.mock('@/components/charts/EChartWrapper', () => ({
  EChartWrapper: ({ option, height }: { option: unknown; height?: number | string }) => (
    <div data-testid="echart-wrapper" data-option={JSON.stringify(option)} style={{ height }} />
  ),
}));

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
      <IntlWrapper>
        <BmiProgressChart
          bmiData={mockBmiData}
          historyData={[
            { date: '2026-03-20', bmi: 23.1 },
            { date: '2026-03-21', bmi: 23.0 },
            { date: '2026-03-22', bmi: 22.9 },
          ]}
          height={220}
        />
      </IntlWrapper>
    );
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });

  it('renders with empty history data without throwing', () => {
    const { container } = render(
      <IntlWrapper>
        <BmiProgressChart bmiData={mockBmiData} historyData={[]} height={220} />
      </IntlWrapper>
    );
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });

  it('keeps the target label inside the chart bounds', () => {
    render(
      <IntlWrapper>
        <BmiProgressChart
          bmiData={mockBmiData}
          historyData={[
            { date: '2026-03-20', bmi: 23.1 },
            { date: '2026-03-21', bmi: 23.0 },
          ]}
          height={220}
        />
      </IntlWrapper>
    );

    const option = JSON.parse(screen.getByTestId('echart-wrapper').dataset.option ?? '{}');

    expect(option.series[0].markLine.data[0].label.position).toBe('insideEndTop');
  });
});
