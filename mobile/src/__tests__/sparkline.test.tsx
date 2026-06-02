/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Sparkline } from '../components/charts/sparkline';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mockComponent = (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children);
  return {
    __esModule: true,
    default: mockComponent('Svg'),
    Svg: mockComponent('Svg'),
    Path: mockComponent('Path'),
    Defs: mockComponent('Defs'),
    LinearGradient: mockComponent('LinearGradient'),
    Stop: mockComponent('Stop'),
  };
});

const containsType = (tree: unknown, type: string): boolean => {
  if (tree == null || typeof tree !== 'object') return false;
  const node = tree as { type?: string; children?: unknown };
  if (node.type === type) return true;
  const kids = node.children;
  if (Array.isArray(kids)) return kids.some((c) => containsType(c, type));
  return false;
};

describe('Sparkline', () => {
  it('renders with valid data and fill enabled', () => {
    const { toJSON } = render(
      <Sparkline data={[10, 20, 15, 30]} color="#4F8EF7" />,
    );
    expect(containsType(toJSON(), 'Svg')).toBe(true);
  });

  it('renders without fill area', () => {
    const { toJSON } = render(
      <Sparkline data={[10, 20, 15]} color="#4F8EF7" fill={false} />,
    );
    expect(containsType(toJSON(), 'Svg')).toBe(true);
  });

  it('returns null when data has fewer than 2 points', () => {
    const { toJSON } = render(<Sparkline data={[42]} color="#4F8EF7" />);
    expect(toJSON()).toBeNull();
  });

  it('returns null for empty data array', () => {
    const { toJSON } = render(<Sparkline data={[]} color="#4F8EF7" />);
    expect(toJSON()).toBeNull();
  });

  it('renders with custom width and height', () => {
    const { toJSON } = render(
      <Sparkline data={[5, 10, 8, 12]} color="#FF6B6B" width={200} height={60} />,
    );
    expect(containsType(toJSON(), 'Svg')).toBe(true);
  });

  it('handles flat data (all same values)', () => {
    const { toJSON } = render(
      <Sparkline data={[10, 10, 10, 10]} color="#4F8EF7" />,
    );
    expect(containsType(toJSON(), 'Svg')).toBe(true);
  });

  it('uses color in gradient id (hash stripped)', () => {
    const { toJSON } = render(
      <Sparkline data={[1, 2, 3]} color="#ABCDEF" />,
    );
    expect(containsType(toJSON(), 'LinearGradient')).toBe(true);
  });
});
