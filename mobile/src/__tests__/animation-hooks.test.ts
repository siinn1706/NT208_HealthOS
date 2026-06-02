/* eslint-env jest */
/**
 * Unit tests for animation hooks.
 * react-native-reanimated/mock stubs all shared-value and animation APIs,
 * so these tests verify the hook contracts (return shape, function calls)
 * without running real animations.
 */
import { renderHook, act } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// ─── useTypingDots ────────────────────────────────────────────────────────────

import { useTypingDots } from '../animations/useTypingDots';

describe('useTypingDots', () => {
  it('returns an array of 3 animated style objects', () => {
    const { result } = renderHook(() => useTypingDots());
    expect(result.current).toHaveLength(3);
    result.current.forEach((style) => {
      expect(typeof style).toBe('object');
    });
  });
});

// ─── usePressSpring ───────────────────────────────────────────────────────────

import { usePressSpring, useTabBounce } from '../animations/usePressSpring';

describe('usePressSpring', () => {
  it('returns onPressIn, onPressOut, and style', () => {
    const { result } = renderHook(() => usePressSpring());
    expect(typeof result.current.onPressIn).toBe('function');
    expect(typeof result.current.onPressOut).toBe('function');
    expect(typeof result.current.style).toBe('object');
  });

  it('onPressIn and onPressOut call without throwing', () => {
    const { result } = renderHook(() => usePressSpring({ pressScale: 0.95, pressOpacity: 0.9 }));
    expect(() => {
      act(() => {
        result.current.onPressIn();
        result.current.onPressOut();
      });
    }).not.toThrow();
  });
});

describe('useTabBounce', () => {
  it('returns trigger and style', () => {
    const { result } = renderHook(() => useTabBounce());
    expect(typeof result.current.trigger).toBe('function');
    expect(typeof result.current.style).toBe('object');
  });

  it('trigger does not throw', () => {
    const { result } = renderHook(() => useTabBounce());
    expect(() => act(() => result.current.trigger())).not.toThrow();
  });
});

// ─── useRipple ────────────────────────────────────────────────────────────────

import { useRipple } from '../animations/useRipple';

describe('useRipple', () => {
  it('returns trigger function and animated style', () => {
    const { result } = renderHook(() => useRipple());
    expect(typeof result.current.trigger).toBe('function');
    expect(typeof result.current.style).toBe('object');
  });

  it('trigger does not throw', () => {
    const { result } = renderHook(() => useRipple());
    expect(() => act(() => result.current.trigger())).not.toThrow();
  });
});

// ─── useBlink ─────────────────────────────────────────────────────────────────

import { useBlink } from '../animations/useBlink';

describe('useBlink', () => {
  it('returns an animated style object', () => {
    const { result } = renderHook(() => useBlink());
    expect(typeof result.current).toBe('object');
  });

  it('works with active=false', () => {
    const { result } = renderHook(() => useBlink(false));
    expect(typeof result.current).toBe('object');
  });
});

// ─── useShimmer ───────────────────────────────────────────────────────────────

import { useShimmer } from '../animations/useShimmer';

describe('useShimmer', () => {
  it('returns an animated style object', () => {
    const { result } = renderHook(() => useShimmer());
    expect(typeof result.current).toBe('object');
  });
});
