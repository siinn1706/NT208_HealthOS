import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Segment { value: number; color: string; }

interface MacroDonutProps {
  segments: Segment[];
  size?: number;
  stroke?: number;
  /** Optional content rendered as absolute-centered overlay (e.g. center label). */
  children?: React.ReactNode;
}

export function MacroDonut({ segments, size = 120, stroke = 18, children }: MacroDonutProps) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG donut — positioned absolute so children can overlay center */}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference - 2; // 2px gap between segments
          const dashOffset = circumference - offset * circumference;
          offset += pct;
          return (
            <Circle
              key={i}
              cx={cx} cy={cx} r={r}
              stroke={seg.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${Math.max(dashLen, 0)} ${circumference}`}
              strokeDashoffset={dashOffset}
              rotation="-90"
              origin={`${cx},${cx}`}
              strokeLinecap="butt"
            />
          );
        })}
      </Svg>
      {/* Center overlay */}
      {children}
    </View>
  );
}
