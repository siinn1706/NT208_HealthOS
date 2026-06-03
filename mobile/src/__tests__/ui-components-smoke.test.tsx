/* eslint-env jest */
/**
 * Smoke tests for low-coverage UI components.
 * Tests render correctness and key branching logic.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ─── Shared mocks ─────────────────────────────────────────────────────────────

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/typography', () => ({
  typography: { h3: {}, bodyMed: {}, body: {}, caption: {}, micro: {}, display: {} },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../components/charts/sparkline', () => ({
  Sparkline: () => {
    const { View } = require('react-native');
    return <View testID="sparkline" />;
  },
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children?: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="progress-ring">{children}</View>;
  },
}));

jest.mock('../components/primitives/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="card">{children}</View>;
  },
}));

jest.mock('../components/primitives/pressable-card', () => ({
  PressableCard: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => {
    const { Pressable } = require('react-native');
    return <Pressable testID="pressable-card" onPress={onPress}>{children}</Pressable>;
  },
}));

jest.mock('../components/primitives/chip', () => ({
  Chip: ({ label }: { label: string }) => {
    const { Text } = require('react-native');
    return <Text testID="chip">{label}</Text>;
  },
}));

jest.mock('../components/primitives/button', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { Pressable, Text } = require('react-native');
    return <Pressable onPress={onPress}><Text>{label}</Text></Pressable>;
  },
}));

jest.mock('../components/primitives/feedback/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text testID="empty-state">{title}</Text>;
  },
}));

jest.mock('../components/primitives/feedback/skeleton', () => ({
  Skeleton: () => {
    const { View } = require('react-native');
    return <View testID="skeleton" />;
  },
}));

jest.mock('../icons', () => ({
  IconPill: () => { const { View } = require('react-native'); return <View testID="icon-pill" />; },
  IconCheck: () => { const { View } = require('react-native'); return <View testID="icon-check" />; },
  IconAlert: () => { const { View } = require('react-native'); return <View testID="icon-alert" />; },
  IconActivity: () => { const { View } = require('react-native'); return <View testID="icon-activity" />; },
  IconFootprints: () => { const { View } = require('react-native'); return <View testID="icon-footprints" />; },
  IconWater: () => { const { View } = require('react-native'); return <View testID="icon-water" />; },
  IconFire: () => { const { View } = require('react-native'); return <View testID="icon-fire" />; },
  IconMoon: () => { const { View } = require('react-native'); return <View testID="icon-moon" />; },
  ChevronRight: () => { const { View } = require('react-native'); return <View testID="chevron-right" />; },
}));

jest.mock('../config/feature-flags', () => ({
  isMobileFeatureEnabled: jest.fn(() => false),
}));

// ─── VitalsMiniCard ───────────────────────────────────────────────────────────

import { VitalsMiniCard } from '../components/home/vitals-mini-card';

describe('VitalsMiniCard', () => {
  it('renders avg and sparkline', () => {
    const { getByText, getByTestId } = render(
      <VitalsMiniCard avg={72} trend={[70, 72, 74]} deltaBpm={-2} />,
    );
    expect(getByText(/72/)).toBeTruthy();
    expect(getByTestId('sparkline')).toBeTruthy();
  });

  it('wraps in PressableCard when onPress provided', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <VitalsMiniCard avg={65} trend={[60, 65]} deltaBpm={5} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('pressable-card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows down arrow chip when deltaBpm negative', () => {
    const { getByTestId } = render(
      <VitalsMiniCard avg={70} trend={[72, 70]} deltaBpm={-2} />,
    );
    expect(getByTestId('chip')).toBeTruthy();
  });
});

// ─── RefillAlertCard ──────────────────────────────────────────────────────────

import { RefillAlertCard } from '../components/meds/refill-alert-card';

describe('RefillAlertCard', () => {
  it('renders message and pharmacy', () => {
    const { getByText } = render(
      <RefillAlertCard message="Metformin running low" daysLeft={5} pharmacy="City Pharmacy" />,
    );
    expect(getByText('Metformin running low')).toBeTruthy();
    expect(getByText('City Pharmacy · Tap to request refill')).toBeTruthy();
  });

  it('uses default pharmacy label when not provided', () => {
    const { getByText } = render(
      <RefillAlertCard message="Low stock" daysLeft={3} />,
    );
    expect(getByText('Pharmacy · Tap to request refill')).toBeTruthy();
  });

  it('calls onPress when pressable', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <RefillAlertCard message="Refill now" daysLeft={2} onPress={onPress} />,
    );
    fireEvent.press(getByText('Refill now'));
    expect(onPress).toHaveBeenCalled();
  });
});

// ─── MedCard ──────────────────────────────────────────────────────────────────

import { MedCard } from '../components/meds/med-card';

describe('MedCard', () => {
  it('renders medication name and dose', () => {
    const { getByText } = render(
      <MedCard name="Metformin" dose="500mg" adherence={0.85} refillDays={12} />,
    );
    expect(getByText('Metformin')).toBeTruthy();
    expect(getByText('500mg')).toBeTruthy();
  });

  it('shows adherence percentage', () => {
    const { getByText } = render(
      <MedCard name="Aspirin" dose="100mg" adherence={0.92} refillDays={7} />,
    );
    expect(getByText('92%')).toBeTruthy();
  });

  it('wraps in PressableCard when onPress provided', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MedCard name="A" dose="10mg" adherence={0.5} refillDays={5} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('pressable-card'));
    expect(onPress).toHaveBeenCalled();
  });
});

// ─── DoseRow ──────────────────────────────────────────────────────────────────

import { DoseRow } from '../components/meds/dose-row';

describe('DoseRow', () => {
  it('renders time and medication name', () => {
    const { getByText } = render(
      <DoseRow time="08:00" name="Aspirin" note="" state="due" />,
    );
    expect(getByText('08:00')).toBeTruthy();
    expect(getByText('Aspirin')).toBeTruthy();
  });

  it('shows take button when not taken', () => {
    const { getByText } = render(
      <DoseRow time="10:00" name="Med" note="" state="due" />,
    );
    expect(getByText('meds.take')).toBeTruthy();
  });

  it('shows check icon when taken', () => {
    const { getByTestId } = render(
      <DoseRow time="10:00" name="Med" note="" state="taken" />,
    );
    expect(getByTestId('icon-check')).toBeTruthy();
  });

  it('calls onTaken when take button pressed', () => {
    const onTaken = jest.fn();
    const { getByText } = render(
      <DoseRow time="10:00" name="Med" note="" state="due" onTaken={onTaken} />,
    );
    fireEvent.press(getByText('meds.take'));
    expect(onTaken).toHaveBeenCalled();
  });
});

// ─── MealRow ──────────────────────────────────────────────────────────────────

import { MealRow } from '../components/meals/meal-row';

describe('MealRow', () => {
  it('renders meal details', () => {
    const { getByText } = render(
      <MealRow
        slotLabel="Breakfast"
        time="07:30"
        title="Oatmeal"
        meta="Carbs · 45g"
        kcal={320}
        icon={null}
      />,
    );
    expect(getByText('Oatmeal')).toBeTruthy();
    expect(getByText('320')).toBeTruthy();
    expect(getByText('Breakfast · 07:30')).toBeTruthy();
  });

  it('shows AI chip when aiScanned is true', () => {
    const { getByText } = render(
      <MealRow
        slotLabel="Lunch"
        time="12:00"
        title="Salad"
        meta="Veggies"
        kcal={200}
        icon={null}
        aiScanned
      />,
    );
    expect(getByText('AI')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <MealRow
        slotLabel="Dinner"
        time="19:00"
        title="Rice"
        meta="Carbs"
        kcal={400}
        icon={null}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByText('Rice'));
    expect(onPress).toHaveBeenCalled();
  });
});

// ─── AdherenceHero ────────────────────────────────────────────────────────────

import { AdherenceHero } from '../components/meds/adherence-hero';

describe('AdherenceHero', () => {
  it('renders taken/total and missed doses', () => {
    const { getByText } = render(
      <AdherenceHero percent={0.9} taken={27} total={30} missed={3} />,
    );
    expect(getByText(/27/)).toBeTruthy();
    expect(getByText('meds.onTrackMissed')).toBeTruthy();
  });

  it('shows percentage label inside ring', () => {
    const { getByText } = render(
      <AdherenceHero percent={0.85} taken={25} total={30} missed={5} />,
    );
    expect(getByText('85%')).toBeTruthy();
  });
});

// ─── KpiRingGrid ─────────────────────────────────────────────────────────────

import { KpiRingGrid } from '../components/home/kpi-ring-grid';

const ITEMS = [
  { id: 'steps', label: 'Steps', val: '8,432', tgt: '10,000', v: 0.84, color: '#1965B3', icon: 'IconFootprints' },
  { id: 'water', label: 'Water', val: '1.8L', tgt: '2.5L', v: 0.72, color: '#12A88A', icon: 'IconWater' },
];

describe('KpiRingGrid', () => {
  it('renders all KPI cells', () => {
    const { getByText } = render(<KpiRingGrid items={ITEMS} />);
    expect(getByText('8,432')).toBeTruthy();
    expect(getByText('Steps')).toBeTruthy();
    expect(getByText('1.8L')).toBeTruthy();
  });

  it('calls onItemPress when cell pressed', () => {
    const onItemPress = jest.fn();
    const { getAllByTestId } = render(<KpiRingGrid items={ITEMS} onItemPress={onItemPress} />);
    fireEvent.press(getAllByTestId('pressable-card')[0]);
    expect(onItemPress).toHaveBeenCalledWith('steps');
  });
});

// ─── ApiState ─────────────────────────────────────────────────────────────────

import { ApiState, MissingApiState } from '../components/api/api-state';

describe('ApiState', () => {
  it('renders title in error/info state', () => {
    const { getByText } = render(<ApiState title="Failed to load" />);
    expect(getByText('Failed to load')).toBeTruthy();
  });

  it('renders message when provided', () => {
    const { getByText } = render(<ApiState title="Error" message="Please retry" />);
    expect(getByText('Please retry')).toBeTruthy();
  });

  it('renders skeleton instead of spinner when loading + skeleton provided', () => {
    const { View } = require('react-native');
    const { getByTestId } = render(
      <ApiState title="Loading" loading skeleton={<View testID="my-skeleton" />} />,
    );
    expect(getByTestId('my-skeleton')).toBeTruthy();
  });

  it('renders empty state when isEmpty + empty provided', () => {
    const { getByTestId } = render(
      <ApiState title="X" isEmpty empty={{ title: 'Nothing here' }} />,
    );
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('renders action button when actionLabel + onAction provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <ApiState title="Error" actionLabel="Retry" onAction={onAction} />,
    );
    fireEvent.press(getByText('Retry'));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('MissingApiState', () => {
  it('renders without crashing', () => {
    const { getByText } = render(
      <MissingApiState title="Not available" contract="GET /v1/xyz" />,
    );
    expect(getByText('Not available')).toBeTruthy();
  });
});
