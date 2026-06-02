/* eslint-env jest */
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

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('../animations/useTypingDots', () => ({
  useTypingDots: () => [{}, {}, {}],
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

jest.mock('../components/primitives/avatar', () => ({
  Avatar: () => {
    const { View } = require('react-native');
    return <View testID="avatar" />;
  },
}));

jest.mock('../icons', () => ({
  IconPill:   () => { const { View } = require('react-native'); return <View testID="icon-pill" />; },
  IconVideo:  () => { const { View } = require('react-native'); return <View testID="icon-video" />; },
  IconCoffee: () => { const { View } = require('react-native'); return <View testID="icon-coffee" />; },
  ChevronRight: () => { const { View } = require('react-native'); return <View testID="chevron-right" />; },
}));

// ─── GoalItem ─────────────────────────────────────────────────────────────────

import { GoalItem } from '../components/home/today-goal-item';
import { palettes } from '../theme/palettes';

const theme = palettes.calm;

describe('GoalItem', () => {
  it('renders label and value', () => {
    const { getByText } = render(
      <GoalItem icon={null} label="Steps" value="8,000" progress={0.8} t={theme} />,
    );
    expect(getByText('Steps')).toBeTruthy();
    expect(getByText('8,000')).toBeTruthy();
  });

  it('renders with met=true without crashing', () => {
    const { getByText } = render(
      <GoalItem icon={null} label="Water" value="2L" progress={1} met t={theme} last />,
    );
    expect(getByText('Water')).toBeTruthy();
  });

  it('renders progress bar fill', () => {
    const { getByText } = render(
      <GoalItem icon={null} label="Sleep" value="7h" progress={0.7} t={theme} />,
    );
    expect(getByText('Sleep')).toBeTruthy();
  });
});

// ─── NextUpRow ────────────────────────────────────────────────────────────────

import { NextUpRow } from '../components/home/next-up-row';

describe('NextUpRow', () => {
  it('renders time, title, and meta', () => {
    const { getByText } = render(
      <NextUpRow time="09:00" title="Take Aspirin" meta="Medicine" icon="IconPill" badge={null} />,
    );
    expect(getByText('09:00')).toBeTruthy();
    expect(getByText('Take Aspirin')).toBeTruthy();
    expect(getByText('Medicine')).toBeTruthy();
  });

  it('shows badge chip when badge provided', () => {
    const { getByTestId } = render(
      <NextUpRow
        time="10:00" title="Appointment" meta="Doctor" icon="IconVideo"
        badge={{ label: 'Due', variant: 'brand' }}
      />,
    );
    expect(getByTestId('chip')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <NextUpRow time="11:00" title="Coffee" meta="Break" icon="IconCoffee" badge={null} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('pressable-card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders without crashing when icon not in ICON_MAP', () => {
    const { getByText } = render(
      <NextUpRow time="12:00" title="Unknown" meta="misc" icon="IconUnknown" badge={null} />,
    );
    expect(getByText('Unknown')).toBeTruthy();
  });
});

// ─── ConversationRow ──────────────────────────────────────────────────────────

import { ConversationRow } from '../components/chat/conversation-row';

describe('ConversationRow', () => {
  it('renders name, role, and last message', () => {
    const { getByText } = render(
      <ConversationRow name="Alice" role="Doctor" last="Hello!" time="09:00" unread={0} />,
    );
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Hello!')).toBeTruthy();
  });

  it('shows unread badge when unread > 0', () => {
    const { getByText } = render(
      <ConversationRow name="Bob" role="" last="Msg" time="10:00" unread={3} />,
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('does not show badge when unread is 0', () => {
    const { queryByText } = render(
      <ConversationRow name="Charlie" role="Nurse" last="Hi" time="11:00" unread={0} />,
    );
    expect(queryByText('0')).toBeNull();
  });

  it('calls onPress when row pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ConversationRow name="Dave" role="" last="Hey" time="12:00" unread={0} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('pressable-card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('omits role label when role is empty string', () => {
    const { queryByText } = render(
      <ConversationRow name="Eve" role="" last="Msg" time="13:00" unread={0} />,
    );
    expect(queryByText('')).toBeNull();
  });
});

// ─── TypingDots ───────────────────────────────────────────────────────────────

import { TypingDots } from '../components/chat/typing-dots';

describe('TypingDots', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TypingDots />);
    expect(toJSON()).not.toBeNull();
  });
});
