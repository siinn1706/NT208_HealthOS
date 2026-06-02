/* eslint-env jest */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeroScoreCard } from '../components/home/hero-score-card';

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style }: { children: React.ReactNode; style?: unknown }) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="progress-ring">{children}</View>;
  },
}));

jest.mock('../components/primitives/pressable-card', () => ({
  PressableCard: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => {
    const { Pressable } = require('react-native');
    return <Pressable onPress={onPress} testID="pressable-card">{children}</Pressable>;
  },
}));

jest.mock('../theme/typography', () => ({
  typography: { caption: {}, display: {}, h3: {} },
}));

describe('HeroScoreCard', () => {
  const defaultProps = { value: 72, target: 100, copy: 'Feeling good today' };

  it('renders value and target', () => {
    const { getByText } = render(<HeroScoreCard {...defaultProps} />);
    expect(getByText('72')).toBeTruthy();
    expect(getByText('/100')).toBeTruthy();
  });

  it('renders copy text', () => {
    const { getByText } = render(<HeroScoreCard {...defaultProps} />);
    expect(getByText('Feeling good today')).toBeTruthy();
  });

  it('renders ProgressRing', () => {
    const { getByTestId } = render(<HeroScoreCard {...defaultProps} />);
    expect(getByTestId('progress-ring')).toBeTruthy();
  });

  it('wraps content in PressableCard when onPress provided', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<HeroScoreCard {...defaultProps} onPress={onPress} />);
    const card = getByTestId('pressable-card');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without PressableCard when no onPress', () => {
    const { queryByTestId } = render(<HeroScoreCard {...defaultProps} />);
    expect(queryByTestId('pressable-card')).toBeNull();
  });

  it('renders i18n key for label', () => {
    const { getByText } = render(<HeroScoreCard {...defaultProps} />);
    expect(getByText('home.todaysHealth')).toBeTruthy();
  });

  it('handles zero value without crashing', () => {
    const { getByText } = render(<HeroScoreCard value={0} target={100} copy="No data" />);
    expect(getByText('0')).toBeTruthy();
  });
});
