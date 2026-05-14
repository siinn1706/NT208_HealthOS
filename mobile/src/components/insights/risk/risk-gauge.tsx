// Semicircle gauge used in risk overview hero card
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../../theme/useTheme';

interface RiskGaugeProps {
  value: number; // 0–1
  size?: number;
}

// Build a semicircle arc path from angle startDeg to endDeg
function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

// Needle tip position on the arc at 0-1 value (arc spans 180°→360°)
function needlePos(cx: number, cy: number, r: number, value: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const deg = 180 + value * 180;
  return {
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  };
}

export function RiskGauge({ value, size = 160 }: RiskGaugeProps) {
  const t = useTheme();
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r  = size * 0.38;
  const sw = 14;

  // Theme-aware track: dark in night, light in calm/warm
  const trackColor = t.border;

  // Three segments: low / moderate / high
  const segments = [
    { start: 180, end: 240, color: t.success },
    { start: 240, end: 300, color: t.warning },
    { start: 300, end: 360, color: t.danger },
  ];

  const needle = needlePos(cx, cy, r, value);

  // Marker ring: use card color for contrast on both themes
  const markerOuter = t.card;
  const markerInner = t.ink;

  return (
    <View style={{ width: size, height: size / 2 + 16 }}>
      <Svg width={size} height={size / 2 + 16}>
        {/* Track arc */}
        <Path
          d={arc(cx, cy, r, 180, 360)}
          stroke={trackColor}
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
        {/* Needle marker dot */}
        <Circle cx={needle.x} cy={needle.y} r={7} fill={markerOuter} />
        <Circle cx={needle.x} cy={needle.y} r={4} fill={markerInner} />
      </Svg>
    </View>
  );
}
