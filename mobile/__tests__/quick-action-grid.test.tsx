import React from 'react';
import { render } from '@testing-library/react-native';
import { QuickActionGrid } from '../src/components/home/quick-action-grid';

jest.mock('../src/theme/useTheme', () => ({
  useTheme: () => ({
    brand: '#0066CC',
    brandSoft: '#E8F0FE',
    danger: '#DC2626',
    radius: { lg: 12 },
  }),
}));

describe('QuickActionGrid', () => {
  it('renders IconTrendUp tile without blank icon', () => {
    const actions = [{ id: 'insights', label: 'Insights', icon: 'IconTrendUp' }];
    const { UNSAFE_getAllByType } = render(
      <QuickActionGrid actions={actions} />,
    );
    // Lucide SVG renders as Path elements — at least one path means icon rendered
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Path } = jest.requireActual('react-native-svg') as { Path: React.ComponentType };
    expect(UNSAFE_getAllByType(Path).length).toBeGreaterThan(0);
  });

  it('renders all 4 default home quick actions', () => {
    const actions = [
      { id: 'meal',     label: 'Meal',     icon: 'IconCoffee'    },
      { id: 'vitals',   label: 'Vitals',   icon: 'IconActivity'  },
      { id: 'ai',       label: 'AI',       icon: 'IconSparkle'   },
      { id: 'insights', label: 'Insights', icon: 'IconTrendUp'   },
    ];
    const { getAllByRole } = render(<QuickActionGrid actions={actions} />);
    // PressableCard now has accessibilityRole="button"
    expect(getAllByRole('button').length).toBe(4);
  });
});
