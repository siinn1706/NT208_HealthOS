/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  KpiGridSkeleton,
  ChartSkeleton,
  ApptListSkeleton,
  MedListSkeleton,
  ChatListSkeleton,
  TimelineSkeleton,
} from '../components/api/skeletons';

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../components/primitives/feedback/skeleton', () => ({
  Skeleton: ({ width, height }: { width?: unknown; height?: unknown }) => {
    const { View } = require('react-native');
    return <View testID="skeleton" style={{ width: width as number, height: height as number }} />;
  },
}));

describe('KpiGridSkeleton', () => {
  it('renders 4 skeleton cells', () => {
    const { getAllByTestId } = render(<KpiGridSkeleton />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(4);
  });
});

describe('ChartSkeleton', () => {
  it('renders without crashing', () => {
    const { getAllByTestId } = render(<ChartSkeleton />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });
});

describe('ApptListSkeleton', () => {
  it('renders default 3 rows', () => {
    const { getAllByTestId } = render(<ApptListSkeleton />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(3);
  });

  it('renders custom number of rows', () => {
    const { getAllByTestId } = render(<ApptListSkeleton rows={5} />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(5);
  });
});

describe('MedListSkeleton', () => {
  it('renders default 4 rows', () => {
    const { getAllByTestId } = render(<MedListSkeleton />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(4);
  });
});

describe('ChatListSkeleton', () => {
  it('renders default 5 rows', () => {
    const { getAllByTestId } = render(<ChatListSkeleton />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(5);
  });
});

describe('TimelineSkeleton', () => {
  it('renders default 4 rows', () => {
    const { getAllByTestId } = render(<TimelineSkeleton />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(4);
  });

  it('renders custom rows', () => {
    const { getAllByTestId } = render(<TimelineSkeleton rows={2} />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(2);
  });
});
