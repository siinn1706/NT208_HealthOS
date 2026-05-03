import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface Segment { value: number; color: string; }

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface MacroDonutProps { segments: Segment[]; size?: number; stroke?: number; }

export function MacroDonut({ segments, size = 120, stroke = 18 }: MacroDonutProps) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;
  return (
    <Svg width={size} height={size}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = pct * circumference - 2; // 2px gap
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
  );
}
