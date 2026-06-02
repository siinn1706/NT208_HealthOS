/* eslint-env jest */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AiInsightCard } from '../components/home/ai-insight-card';

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../icons', () => ({
  IconSparkle: () => {
    const { View } = require('react-native');
    return <View testID="icon-sparkle" />;
  },
}));

jest.mock('../components/primitives/pressable-card', () => ({
  PressableCard: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => {
    const { Pressable } = require('react-native');
    return <Pressable onPress={onPress} testID="pressable-card">{children}</Pressable>;
  },
}));

jest.mock('../theme/typography', () => ({
  typography: { micro: {}, bodyMed: {}, caption: {} },
}));

describe('AiInsightCard', () => {
  const defaultProps = {
    title: 'Hydration low',
    body: 'You drank only 600ml today. Aim for 2L.',
  };

  it('renders title and body', () => {
    const { getByText } = render(<AiInsightCard {...defaultProps} />);
    expect(getByText('Hydration low')).toBeTruthy();
    expect(getByText('You drank only 600ml today. Aim for 2L.')).toBeTruthy();
  });

  it('renders AI insight icon', () => {
    const { getByTestId } = render(<AiInsightCard {...defaultProps} />);
    expect(getByTestId('icon-sparkle')).toBeTruthy();
  });

  it('renders i18n label key', () => {
    const { getByText } = render(<AiInsightCard {...defaultProps} />);
    expect(getByText('home.aiInsight')).toBeTruthy();
  });

  it('wraps in PressableCard and fires onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<AiInsightCard {...defaultProps} onPress={onPress} />);
    fireEvent.press(getByTestId('pressable-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without PressableCard when no onPress provided', () => {
    const { queryByTestId } = render(<AiInsightCard {...defaultProps} />);
    expect(queryByTestId('pressable-card')).toBeNull();
  });

  it('renders with empty body string without crashing', () => {
    const { getByText } = render(<AiInsightCard title="No body" body="" />);
    expect(getByText('No body')).toBeTruthy();
  });
});
