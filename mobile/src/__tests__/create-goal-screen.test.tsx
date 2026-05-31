/* eslint-env jest */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: mockBack,
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

jest.mock('../auth/session-store', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  clearStoredSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CreateGoalScreen } = require('../components/insights/goals/create-goal-screen') as typeof import('../components/insights/goals/create-goal-screen');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { invalidateApiQuery } = require('../api/query') as typeof import('../api/query');
const mockInvalidate = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockFetch = jest.fn();
global.fetch = mockFetch;

type TestNode = {
  parent: TestNode | null;
  props: {
    accessibilityRole?: string;
    accessibilityState?: { disabled?: boolean };
    onPress?: () => unknown;
  };
};

function pressButtonText(textNode: TestNode) {
  let buttonNode: TestNode | null = textNode;
  while (buttonNode && buttonNode.props.accessibilityRole !== 'button') {
    buttonNode = buttonNode.parent;
  }
  if (!buttonNode) throw new Error('Button node not found');
  if (buttonNode.props.accessibilityState?.disabled) return;

  let pressNode: TestNode | null = buttonNode;
  while (pressNode && typeof pressNode.props.onPress !== 'function') {
    pressNode = pressNode.parent;
  }
  const onPress = pressNode?.props.onPress;
  if (typeof onPress !== 'function') throw new Error('Button onPress not found');
  return onPress();
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(global, '__DEV__', { value: true, configurable: true });
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({
      data: {
        id: 'goal-1',
        user_id: 'user-1',
        target_weight_kg: 72.5,
        deadline: null,
        created_at: '2026-05-31T00:00:00.000Z',
        updated_at: '2026-05-31T00:00:00.000Z',
      },
    }),
    text: async () => '',
  });
});

describe('CreateGoalScreen', () => {
  it('saves the supported weight goal through the Core health-goal API', async () => {
    const { getByText, getByLabelText, queryByText } = render(<CreateGoalScreen />);

    expect(getByText('Weight')).toBeTruthy();
    expect(queryByText('Steps')).toBeNull();

    fireEvent.press(getByText('insights.continue'));
    fireEvent.changeText(getByLabelText('insights.wizardTargetInputLabel'), '72.5');
    await act(async () => {
      await pressButtonText(getByText('insights.saveGoal'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/v1/health-goals', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ target_weight_kg: 72.5 }),
      }));
      expect(mockInvalidate).toHaveBeenCalledWith('health-goals.current');
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('blocks weight goals outside the backend range', () => {
    const { getByText, getByLabelText } = render(<CreateGoalScreen />);

    fireEvent.press(getByText('insights.continue'));
    fireEvent.changeText(getByLabelText('insights.wizardTargetInputLabel'), '20');

    expect(getByText('insights.goalTargetInvalid')).toBeTruthy();
    pressButtonText(getByText('insights.saveGoal'));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
