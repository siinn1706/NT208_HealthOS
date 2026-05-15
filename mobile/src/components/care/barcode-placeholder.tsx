import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';

// Fixed bar pattern — deterministic, avoids re-render variance
const BAR_PATTERN = [2, 3, 2, 2, 4, 2, 3, 2, 3, 4, 2, 2, 3, 2, 4, 2, 3, 2, 2, 3, 3, 2];
const GAP_PATTERN = [3, 2, 3, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 3];

interface BarcodePlaceholderProps {
  size?: number;
}

export function BarcodePlaceholder({ size = 120 }: BarcodePlaceholderProps) {
  const t = useTheme();
  const pad = 8;
  const bars: React.ReactNode[] = [];
  let x = pad;
  let idx = 0;
  while (x < size - pad && idx < BAR_PATTERN.length) {
    const w = BAR_PATTERN[idx % BAR_PATTERN.length];
    bars.push(
      <Rect
        key={idx}
        x={x}
        y={pad + 4}
        width={w}
        height={size - pad * 2 - 8}
        fill={t.ink3}
        opacity={0.55}
      />,
    );
    x += w + GAP_PATTERN[idx % GAP_PATTERN.length];
    idx++;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: t.border }}>
      <Svg width={size} height={size}>
        <Rect width={size} height={size} fill={t.bgElev} />
        {bars}
      </Svg>
    </View>
  );
}
