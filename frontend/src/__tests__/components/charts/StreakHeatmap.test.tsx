import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StreakHeatmap } from '@/components/charts/StreakHeatmap';
import { IntlWrapper } from '@/__tests__/test-utils';
import type { UserStreakEntry } from '@/data/gamification';

const mockEntries: UserStreakEntry[] = Array.from({ length: 56 }, (_, i) => ({
  date: `2026-03-${String(i % 30 + 1).padStart(2, '0')}`,
  completed: i % 3 !== 0,
  activitiesCount: i % 3 === 0 ? 0 : i % 3,
}));

describe('StreakHeatmap', () => {
  it('renders heatmap grid', () => {
    const { container } = render(
      <IntlWrapper>
        <StreakHeatmap entries={mockEntries} />
      </IntlWrapper>
    );
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });

  it('renders with empty entries without throwing', () => {
    const { container } = render(
      <IntlWrapper>
        <StreakHeatmap entries={[]} />
      </IntlWrapper>
    );
    expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
  });
});
