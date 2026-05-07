import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';

export type RangeKey = '1D' | '7D' | '1M' | '6M' | '1Y';

interface VitalsLineChartProps {
  points: { x: number; y: number }[];
  width?: number;
  height?: number;
  targetMin?: number;
  targetMax?: number;
  yLabels?: string[];
  xLabels?: string[];
}

const PAD_LEFT = 28;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;

function normalize(vals: number[], min: number, max: number) {
  const range = max - min || 1;
  return vals.map((v) => (v - min) / range);
}

function plotX(nx: number, w: number) {
  return PAD_LEFT + nx * (w - PAD_LEFT - PAD_RIGHT);
}
function plotY(ny: number, h: number) {
  return (h - PAD_BOTTOM) - ny * (h - PAD_TOP - PAD_BOTTOM);
}

function buildLinePath(xs: number[], ys: number[], w: number, h: number): string {
  if (xs.length < 2) return '';
  return xs
    .map((nx, i) => `${i === 0 ? 'M' : 'L'}${plotX(nx, w)},${plotY(ys[i], h)}`)
    .join(' ');
}

function buildAreaPath(xs: number[], ys: number[], w: number, h: number): string {
  if (xs.length < 2) return '';
  const line = buildLinePath(xs, ys, w, h);
  const lastX = plotX(xs[xs.length - 1], w);
  const firstX = plotX(xs[0], w);
  const baseline = h - PAD_BOTTOM;
  return `${line} L${lastX},${baseline} L${firstX},${baseline} Z`;
}

export function VitalsLineChart({
  points,
  width = 320,
  height = 140,
  targetMin,
  targetMax,
  yLabels,
  xLabels,
}: VitalsLineChartProps) {
  const t = useTheme();

  if (points.length < 2) {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius: t.radius.md, backgroundColor: t.bgElev }]} />
    );
  }

  const rawX = points.map((p) => p.x);
  const rawY = points.map((p) => p.y);
  const minX = Math.min(...rawX), maxX = Math.max(...rawX);
  const minY = Math.min(...rawY) * 0.95, maxY = Math.max(...rawY) * 1.05;

  const nX = normalize(rawX, minX, maxX);
  const nY = normalize(rawY, minY, maxY);

  const linePath = buildLinePath(nX, nY, width, height);
  const areaPath = buildAreaPath(nX, nY, width, height);

  const tMinN = targetMin !== undefined ? (targetMin - minY) / (maxY - minY || 1) : null;
  const tMaxN = targetMax !== undefined ? (targetMax - minY) / (maxY - minY || 1) : null;
  const tTopY = tMaxN !== null ? plotY(Math.min(1, Math.max(0, tMaxN)), height) : null;
  const tBotY = tMinN !== null ? plotY(Math.min(1, Math.max(0, tMinN)), height) : null;

  const gridFracs = [0.25, 0.5, 0.75];
  const gridYs = gridFracs.map((f) => plotY(f, height));
  const autoYLabels = yLabels ?? gridFracs.map((f) => Math.round(minY + f * (maxY - minY)).toString());

  return (
    <View style={[styles.root, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.brand} stopOpacity={0.22} />
            <Stop offset="1" stopColor={t.brand} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines + Y axis labels */}
        {gridYs.map((y, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PAD_LEFT} y1={y} x2={width - PAD_RIGHT} y2={y}
              stroke={t.borderStrong} strokeWidth={1} strokeDasharray="4 4"
            />
            <SvgText
              x={PAD_LEFT - 4} y={y + 4}
              textAnchor="end" fontSize={9} fill={t.ink4}
              fontFamily="Inter_400Regular"
            >
              {autoYLabels[i]}
            </SvgText>
          </React.Fragment>
        ))}

        {/* X axis labels */}
        {xLabels && xLabels.map((label, i) => {
          const frac = xLabels.length > 1 ? i / (xLabels.length - 1) : 0.5;
          return (
            <SvgText
              key={i}
              x={plotX(frac, width)} y={height - 2}
              textAnchor="middle" fontSize={9} fill={t.ink4}
              fontFamily="Inter_400Regular"
            >
              {label}
            </SvgText>
          );
        })}

        {/* Target zone */}
        {tTopY !== null && tBotY !== null && (
          <Path
            d={`M${PAD_LEFT},${tTopY} L${width - PAD_RIGHT},${tTopY} L${width - PAD_RIGHT},${tBotY} L${PAD_LEFT},${tBotY} Z`}
            fill={t.success}
            fillOpacity={0.1}
          />
        )}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path d={linePath} stroke={t.brand} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points — solid with card stroke for separation */}
        {nX.map((nx, i) => {
          const cx = plotX(nx, width);
          const cy = plotY(nY[i], height);
          return <Circle key={i} cx={cx} cy={cy} r={3} fill={t.brand} stroke={t.card} strokeWidth={1.5} />;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { overflow: 'hidden' },
  placeholder: {},
});
