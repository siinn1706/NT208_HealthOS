/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedStatusBar } from '../components/primitives/themed-status-bar';

jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: { style: string }) => {
    const { View } = require('react-native');
    return <View testID={`status-bar-${style}`} />;
  },
}));

// Provide a controllable ThemeContext
let mockThemeName = 'calm';
jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({ name: mockThemeName, tokens: {}, setTheme: jest.fn() }),
}));

describe('ThemedStatusBar', () => {
  it('renders dark style for calm theme', () => {
    mockThemeName = 'calm';
    const { getByTestId } = render(<ThemedStatusBar />);
    expect(getByTestId('status-bar-dark')).toBeTruthy();
  });

  it('renders light style for night theme', () => {
    mockThemeName = 'night';
    const { getByTestId } = render(<ThemedStatusBar />);
    expect(getByTestId('status-bar-light')).toBeTruthy();
  });

  it('renders dark style for warm theme', () => {
    mockThemeName = 'warm';
    const { getByTestId } = render(<ThemedStatusBar />);
    expect(getByTestId('status-bar-dark')).toBeTruthy();
  });
});
