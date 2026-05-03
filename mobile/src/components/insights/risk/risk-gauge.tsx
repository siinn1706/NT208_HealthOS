// Semicircle gauge used in risk overview hero card
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface RiskGaugeProps {
  value: number; // 0–1
  size?: number;
}

// Build a semicircle arc path from angle startDeg to endDeg on a circle
function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

// Needle tip position on the arc at 0-1 value
function needlePos(cx: number, cy: number, r: number, value: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  // arc spans 180° → 360° (left to right, bottom half of circle)
  const deg = 180 + value * 180;
  return {
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  };
}

export function RiskGauge({ value, size = 160 }: RiskGaugeProps) {
  const cx = size / 2;
  const cy = size / 2 + 10; // shift centre down so arc fits in upper half
  const r  = size * 0.38;
  const sw = 14; // stroke width of arc segments

  // Three segments: green(180→240) / yellow(240→300) / red(300→360)
  const segments = [
    { start: 180, end: 240, color: '#059669' },
    { start: 240, end: 300, color: '#D97706' },
    { start: 300, end: 360, color: '#E54D4D' },
  ];

  const needle = needlePos(cx, cy, r, value);

  return (
    <View style={{ width: size, height: size / 2 + 16 }}>
      <Svg width={size} height={size / 2 + 16}>
        {/* Track */}
        <Path
          d={arc(cx, cy, r, 180, 360)}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
        />
        {/* Coloured segments */}
        {segments.map((seg, i) => (
          <Path
            key={i}
            d={arc(cx, cy, r, seg.start, seg.end)}
            stroke={seg.color}
            strokeWidth={sw - 2}
            fill="none"
            strokeLinecap="butt"
          />
        ))}
        {/* Needle dot */}
        <Circle cx={needle.x} cy={needle.y} r={7} fill="#fff" />
        <Circle cx={needle.x} cy={needle.y} r={4} fill="#1A1A2E" />
      </Svg>
    </View>
  );
}
