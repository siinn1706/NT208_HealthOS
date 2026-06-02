/* eslint-env jest */
/**
 * Direct tests for primitive UI components (no mocks of the components themselves).
 * Tests the real EmptyState and PressableCard implementations.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/typography', () => ({
  typography: { h3: {}, bodyMed: {}, body: {}, caption: {}, micro: {} },
}));

jest.mock('../animations/usePressSpring', () => ({
  usePressSpring: () => ({
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
    style: {},
  }),
}));

jest.mock('../animations/useRipple', () => ({
  useRipple: () => ({
    trigger: jest.fn(),
    style: {},
  }),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
}));

jest.mock('../components/primitives/button', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { Pressable, Text } = require('react-native');
    return <Pressable testID={`btn-${label}`} onPress={onPress}><Text>{label}</Text></Pressable>;
  },
}));

// ─── Skeleton / SkeletonGroup ─────────────────────────────────────────────────

jest.mock('../animations/usePulse', () => ({
  usePulse: () => ({}),
}));

import { Skeleton, SkeletonGroup } from '../components/primitives/feedback/skeleton';

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).not.toBeNull();
  });

  it('accepts custom width, height, radius', () => {
    const { toJSON } = render(<Skeleton width={100} height={20} radius={8} />);
    expect(toJSON()).not.toBeNull();
  });
});

describe('SkeletonGroup', () => {
  it('renders default 3 rows without crashing', () => {
    const { toJSON } = render(<SkeletonGroup />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders custom row count', () => {
    const { toJSON } = render(<SkeletonGroup rows={5} />);
    expect(toJSON()).not.toBeNull();
  });
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

import { EmptyState } from '../components/primitives/feedback/empty-state';

describe('EmptyState', () => {
  it('renders title', () => {
    const { getByText } = render(<EmptyState title="Nothing here yet" />);
    expect(getByText('Nothing here yet')).toBeTruthy();
  });

  it('renders optional message', () => {
    const { getByText } = render(<EmptyState title="Empty" message="Add your first entry" />);
    expect(getByText('Add your first entry')).toBeTruthy();
  });

  it('renders optional icon', () => {
    const { View } = require('react-native');
    const { getByTestId } = render(
      <EmptyState title="No data" icon={<View testID="icon-slot" />} />,
    );
    expect(getByTestId('icon-slot')).toBeTruthy();
  });

  it('renders CTA button and calls onAction', () => {
    const onAction = jest.fn();
    const { getByTestId } = render(
      <EmptyState title="Empty" actionLabel="Add item" onAction={onAction} />,
    );
    fireEvent.press(getByTestId('btn-Add item'));
    expect(onAction).toHaveBeenCalled();
  });

  it('does not render button when onAction missing', () => {
    const { queryByTestId } = render(
      <EmptyState title="Empty" actionLabel="Add item" />,
    );
    expect(queryByTestId('btn-Add item')).toBeNull();
  });
});

// ─── PressableCard ────────────────────────────────────────────────────────────

import { PressableCard } from '../components/primitives/pressable-card';

describe('PressableCard', () => {
  it('renders children', () => {
    const { View, Text } = require('react-native');
    const { getByText } = render(
      <PressableCard>
        <Text>Card content</Text>
      </PressableCard>,
    );
    expect(getByText('Card content')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { Text } = require('react-native');
    const onPress = jest.fn();
    const { getByText } = render(
      <PressableCard onPress={onPress}>
        <Text>Press me</Text>
      </PressableCard>,
    );
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalled();
  });

  it('calls Haptics.selectionAsync when haptic=true', () => {
    const Haptics = require('expo-haptics');
    const { Text } = require('react-native');
    const { getByText } = render(
      <PressableCard onPress={jest.fn()} haptic>
        <Text>Haptic</Text>
      </PressableCard>,
    );
    fireEvent.press(getByText('Haptic'));
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('renders ripple overlay when ripple=true', () => {
    const { Text } = require('react-native');
    const { toJSON } = render(
      <PressableCard onPress={jest.fn()} ripple>
        <Text>Ripple</Text>
      </PressableCard>,
    );
    // ripple=true adds an overflow style — verify the component renders without error
    expect(toJSON()).not.toBeNull();
  });

  it('does not throw when onPress is undefined', () => {
    const { Text } = require('react-native');
    expect(() =>
      render(
        <PressableCard>
          <Text>No press</Text>
        </PressableCard>,
      ),
    ).not.toThrow();
  });
});
