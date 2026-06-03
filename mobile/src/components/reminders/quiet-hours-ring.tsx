import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { withOpacity } from '../../utils/color-mix';

const SIZE = 200;
const OUTER_R = 90;
const INNER_R = 68;
const CX = SIZE / 2;
const CY = SIZE / 2;
const SEG_COUNT = 24;
const GAP_DEG = 2.5;
const LABEL_R = OUTER_R + 13;

interface QuietHoursRingProps {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

function parseHour(hhmm: string) {
  return parseInt(hhmm.split(':')[0], 10);
}

function isQuiet(h: number, startH: number, endH: number) {
  // wraps midnight when startH > endH (e.g. 22–07)
  if (startH > endH) return h >= startH || h < endH;
  return h >= startH && h < endH;
}

function arcPath(i: number, outerR: number, innerR: number): string {
  const startDeg = (i * 360) / SEG_COUNT - 90 + GAP_DEG / 2;
  const endDeg = ((i + 1) * 360) / SEG_COUNT - 90 - GAP_DEG / 2;
  const sRad = (startDeg * Math.PI) / 180;
  const eRad = (endDeg * Math.PI) / 180;
  const x1 = CX + outerR * Math.cos(sRad);
  const y1 = CY + outerR * Math.sin(sRad);
  const x2 = CX + outerR * Math.cos(eRad);
  const y2 = CY + outerR * Math.sin(eRad);
  const x3 = CX + innerR * Math.cos(eRad);
  const y3 = CY + innerR * Math.sin(eRad);
  const x4 = CX + innerR * Math.cos(sRad);
  const y4 = CY + innerR * Math.sin(sRad);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerR} ${innerR} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

const HOUR_LABELS = [
  { h: 0,  deg: -90 },
  { h: 6,  deg: 0   },
  { h: 12, deg: 90  },
  { h: 18, deg: 180 },
];

export function QuietHoursRing({ start, end }: QuietHoursRingProps) {
  const t = useTheme();
  const startH = parseHour(start);
  const endH = parseHour(end);

  let quietCount = 0;
  for (let i = 0; i < SEG_COUNT; i++) {
    if (isQuiet(i, startH, endH)) quietCount++;
  }

  const activeColor = withOpacity(t.borderStrong, 0.45);

  return (
    <View style={s.wrap}>
      <Svg width={SIZE} height={SIZE}>
        {Array.from({ length: SEG_COUNT }, (_, i) => (
          <Path
            key={i}
            d={arcPath(i, OUTER_R, INNER_R)}
            fill={isQuiet(i, startH, endH) ? t.brand : activeColor}
          />
        ))}

        {/* Hour labels at cardinal positions */}
        {HOUR_LABELS.map(({ h, deg }) => {
          const rad = (deg * Math.PI) / 180;
          const lx = CX + LABEL_R * Math.cos(rad);
          const ly = CY + LABEL_R * Math.sin(rad);
          return (
            <SvgText
              key={h}
              x={lx}
              y={ly + 4}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={t.ink3}
            >
              {h === 0 ? '24' : String(h)}
            </SvgText>
          );
        })}

        {/* Center copy */}
        <SvgText x={CX} y={CY - 13} textAnchor="middle" fontSize="9" fontWeight="700" fill={t.ink3}>
          QUIET
        </SvgText>
        <SvgText x={CX} y={CY + 8} textAnchor="middle" fontSize="22" fontWeight="700" fill={t.ink}>
          {`${quietCount} hrs`}
        </SvgText>
        <SvgText x={CX} y={CY + 23} textAnchor="middle" fontSize="10" fontWeight="600" fill={t.ink3}>
          {`${start}–${end}`}
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: t.brand }]} />
          <Text style={[s.legendText, { color: t.ink3 }]}>Quiet</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: activeColor }]} />
          <Text style={[s.legendText, { color: t.ink3 }]}>Active</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:       { alignItems: 'center' },
  legend:     { flexDirection: 'row', gap: 16, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 3 },
  legendText: { ...typography.micro, fontWeight: '600' as const },
});
