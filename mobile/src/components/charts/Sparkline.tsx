import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  fill?: boolean;
}

function buildPath(data: number[], w: number, h: number): { line: string; area: string } {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);

  const pts = data.map((v, i) => ({
    x: i * step,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));

  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const area = `${line} L${(data.length - 1) * step},${h} L0,${h} Z`;

  return { line, area };
}

export function Sparkline({ data, color, width = 120, height = 40, fill = true }: SparklineProps) {
  if (data.length < 2) return null;
  const { line, area } = buildPath(data, width, height);
  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <Svg width={width} height={height}>
      {fill && (
        <>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.25} />
              <Stop offset="1" stopColor={color} stopOpacity={0}    />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${gradId})`} />
        </>
      )}
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
