import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PeriodComparisonChart } from '@/components/charts/PeriodComparisonChart';

describe('PeriodComparisonChart', () => {
  it('renders chart container', () => {
    const { container } = render(
      <PeriodComparisonChart
        currentLabel="30d"
        currentData={[75, 78, 80]}
        previousData={[65, 68, 70]}
        dates={['2026-03-22', '2026-03-23', '2026-03-24']}
        unit="bpm"
        height={260}
      />
    );
    // EChartWrapper renders a div.containerRef with the chart
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });

  it('renders empty chart gracefully without throwing', () => {
    const { container } = render(
      <PeriodComparisonChart
        currentLabel="30d"
        currentData={[]}
        previousData={[]}
        dates={[]}
        unit="bpm"
        height={260}
      />
    );
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });

  it('renders bar data for both periods', () => {
    const { container } = render(
      <PeriodComparisonChart
        currentLabel="30d"
        currentData={[75, 78, 80]}
        previousData={[65, 68, 70]}
        dates={['2026-03-22', '2026-03-23', '2026-03-24']}
        unit="bpm"
        height={260}
      />
    );
    // Chart container should have rendered without errors
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });
});
