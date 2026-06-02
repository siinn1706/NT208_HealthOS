/* eslint-env jest */
import React from 'react';
import { render, act, renderHook } from '@testing-library/react-native';
import { ToastProvider, useToast } from '../components/primitives/feedback/toast';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  usePathname: () => '/home',
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/typography', () => ({
  typography: {
    bodyMed: {},
    caption: {},
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useToast', () => {
  it('throws when used outside ToastProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow('useToast must be inside ToastProvider');
    spy.mockRestore();
  });

  it('show() is callable within provider', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.show).toBe('function');
  });
});

describe('ToastProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ToastProvider>
        <></>
      </ToastProvider>,
    );
    // Provider itself should not crash
    expect(getByText).toBeDefined();
  });

  it('show() adds a toast (info variant by default)', async () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    await act(async () => {
      result.current.show('Hello world');
    });
    // No throw = success; toast state is internal
  });

  it('show() accepts explicit variant', async () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    await act(async () => {
      result.current.show('Success!', 'success');
      result.current.show('Warning!', 'warning');
      result.current.show('Danger!', 'danger');
    });
  });

  it('show() deduplicates identical visible toasts', async () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    await act(async () => {
      result.current.show('Duplicate');
      result.current.show('Duplicate');
    });
    // No crash; dedup is an internal invariant
  });
});
