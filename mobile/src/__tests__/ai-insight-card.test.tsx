/* eslint-env jest */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AiInsightCard } from '../components/home/ai-insight-card';
import type { DashboardAiAdvice } from '../../../shared/api-contracts';

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'home.aiAdviceSourceAi': 'AI generated',
      'home.aiAdviceSourceRule': 'Rule based',
      'home.aiAdviceSourceCache': 'Cached advice',
      'home.aiAdviceSourceFallback': 'Safe fallback',
    }[key] ?? key),
  }),
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
  const advice: DashboardAiAdvice = {
    id: 'advice-1',
    status: 'ready',
    category: 'activity',
    priority: 'medium',
    title: 'Walk after lunch',
    body: 'A short walk helps close today steps gap.',
    source: 'ai',
    actions: [
      { id: 'walk-1', type: 'walk', label: 'Walk now' },
      { id: 'trends-1', type: 'view_trends', label: 'Review trends' },
    ],
    evidence: [{ metric: 'Steps', value: 800, unit: 'steps', comparison: 'below target' }],
    rag_sources: [],
    generated_at: '2026-06-30T12:00:00Z',
    expires_at: '2026-06-30T12:15:00Z',
    disclaimer: 'Not medical advice.',
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

  it('renders loading state without stale fallback copy', () => {
    const { getByText } = render(<AiInsightCard loading />);
    expect(getByText('home.aiAdviceLoadingTitle')).toBeTruthy();
    expect(getByText('home.aiAdviceLoadingBody')).toBeTruthy();
  });

  it('renders AI advice source, evidence, actions, and disclaimer', () => {
    const onActionPress = jest.fn();
    const { getByText } = render(<AiInsightCard advice={advice} onActionPress={onActionPress} />);

    expect(getByText('AI generated')).toBeTruthy();
    expect(getByText('Walk after lunch')).toBeTruthy();
    expect(getByText('A short walk helps close today steps gap.')).toBeTruthy();
    expect(getByText('Steps: 800 steps · below target')).toBeTruthy();
    expect(getByText('Not medical advice.')).toBeTruthy();

    fireEvent.press(getByText('Walk now'));
    expect(onActionPress).toHaveBeenCalledWith('walk');

    fireEvent.press(getByText('Review trends'));
    expect(onActionPress).toHaveBeenCalledWith('view_trends');
  });

  it('does not trigger card detail navigation when an action is pressed', () => {
    const onActionPress = jest.fn();
    const onPress = jest.fn();
    const { getByText } = render(
      <AiInsightCard advice={advice} onActionPress={onActionPress} onPress={onPress} />,
    );

    fireEvent.press(getByText('Walk now'));

    expect(onActionPress).toHaveBeenCalledWith('walk');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders fallback status distinctly', () => {
    const fallbackAdvice: DashboardAiAdvice = {
      ...advice,
      id: 'fallback-1',
      status: 'fallback',
      source: 'rule',
      title: 'Use fallback plan',
    };
    const { getByText } = render(<AiInsightCard advice={fallbackAdvice} />);

    expect(getByText('Safe fallback')).toBeTruthy();
    expect(getByText('Use fallback plan')).toBeTruthy();
  });

  it('renders retry action when advice fetch fails', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<AiInsightCard error onRetry={onRetry} />);

    expect(getByText('home.aiAdviceUnavailable')).toBeTruthy();
    expect(getByText('home.aiAdviceUnavailableMessage')).toBeTruthy();

    fireEvent.press(getByText('common.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
