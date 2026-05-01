import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';

export type RangeKey = '1D' | '7D' | '1M' | '6M' | '1Y';

interface VitalsLineChartProps {
  points: { x: number; y: number }[];
  width?: number;
  height?: number;
  targetMin?: number;
  targetMax?: number;
}

function normalize(vals: number[], min: number, max: number) {
  const range = max - min || 1;
  return vals.map((v) => (v - min) / range);
}

function buildLinePath(xs: number[], ys: number[], w: number, h: number, pad: number): string {
  if (xs.length < 2) return '';
  const commands: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    const px = pad + xs[i] * (w - 2 * pad);
    const py = h - pad - ys[i] * (h - 2 * pad);
    commands.push(i === 0 ? `M${px},${py}` : `L${px},${py}`);
  }
  return commands.join(' ');
}

function buildAreaPath(xs: number[], ys: number[], w: number, h: number, pad: number): string {
  if (xs.length < 2) return '';
  const line = buildLinePath(xs, ys, w, h, pad);
  const lastX = pad + xs[xs.length - 1] * (w - 2 * pad);
  const firstX = pad + xs[0] * (w - 2 * pad);
  return `${line} L${lastX},${h - pad} L${firstX},${h - pad} Z`;
}

export function VitalsLineChart({ points, width = 320, height = 140, targetMin, targetMax }: VitalsLineChartProps) {
  const t = useTheme();
  const pad = 12;

  if (points.length < 2) {
    return <View style={[styles.placeholder, { width, height, borderRadius: t.radius.md, backgroundColor: t.bgElev }]} />;
  }

  const rawX = points.map((p) => p.x);
  const rawY = points.map((p) => p.y);
  const minX = Math.min(...rawX), maxX = Math.max(...rawX);
  const minY = Math.min(...rawY) * 0.95, maxY = Math.max(...rawY) * 1.05;

  const nX = normalize(rawX, minX, maxX);
  const nY = normalize(rawY, minY, maxY);

  const linePath = buildLinePath(nX, nY, width, height, pad);
  const areaPath = buildAreaPath(nX, nY, width, height, pad);

  // Target zone (normalized)
  const tMinN = targetMin !== undefined ? (targetMin - minY) / (maxY - minY || 1) : null;
  const tMaxN = targetMax !== undefined ? (targetMax - minY) / (maxY - minY || 1) : null;
  const tTopY = tMaxN !== null ? height - pad - Math.min(1, Math.max(0, tMaxN)) * (height - 2 * pad) : null;
  const tBotY = tMinN !== null ? height - pad - Math.min(1, Math.max(0, tMinN)) * (height - 2 * pad) : null;

  // Dashed grid lines (4 horizontal)
  const gridLines = [0.25, 0.5, 0.75].map((frac) => height - pad - frac * (height - 2 * pad));

  return (
    <View style={[styles.root, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.brand} stopOpacity={0.14} />
            <Stop offset="1" stopColor={t.brand} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Dashed grid */}
        {gridLines.map((y, i) => (
          <Line key={i} x1={pad} y1={y} x2={width - pad} y2={y} stroke={t.borderStrong} strokeWidth={1} strokeDasharray="4 4" />
        ))}

        {/* Target zone */}
        {tTopY !== null && tBotY !== null && (
          <Path
            d={`M${pad},${tTopY} L${width - pad},${tTopY} L${width - pad},${tBotY} L${pad},${tBotY} Z`}
            fill={t.success}
            fillOpacity={0.1}
          />
        )}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path d={linePath} stroke={t.brand} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points — hollow circles */}
        {nX.map((nx, i) => {
          const cx = pad + nx * (width - 2 * pad);
          const cy = height - pad - nY[i] * (height - 2 * pad);
          return (
            <Circle key={i} cx={cx} cy={cy} r={3} fill={t.card} stroke={t.brand} strokeWidth={1.5} />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { overflow: 'hidden' },
  placeholder: {},
});
