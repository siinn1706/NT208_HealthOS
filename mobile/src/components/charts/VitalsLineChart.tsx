import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { VitalPoint } from "@/api/endpoints/vitals";
import { useTheme } from "@/theme";

interface Props {
  data: VitalPoint[];
  metric: "heart_rate" | "systolic" | "diastolic";
  height?: number;
  /** When the series has too few points, shown instead of the default English string. */
  emptyMessage?: string;
}

const PADDING = { top: 16, right: 16, bottom: 24, left: 32 };

function getValue(point: VitalPoint, metric: Props["metric"]): number | null {
  const v = point[metric];
  return typeof v === "number" ? v : null;
}

export function VitalsLineChart({
  data,
  metric,
  height = 180,
  emptyMessage = "Not enough data yet.",
}: Props) {
  const { colors, typography } = useTheme();
  const valid = data
    .map((p) => ({ date: p.date, value: getValue(p, metric) }))
    .filter((p): p is { date: string; value: number } => p.value !== null);

  if (valid.length < 2) {
    return (
      <View
        style={{
          height,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.sm.fontSize,
          }}
        >
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const width = 320;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;
  const min = Math.min(...valid.map((p) => p.value));
  const max = Math.max(...valid.map((p) => p.value));
  const range = Math.max(1, max - min);

  const points = valid.map((p, i) => {
    const x = PADDING.left + (i * innerW) / (valid.length - 1);
    const y = PADDING.top + innerH - ((p.value - min) / range) * innerH;
    return { x, y, value: p.value, date: p.date };
  });

  const path = points
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
    .join(" ");

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = PADDING.top + innerH - f * innerH;
          const value = (min + range * f).toFixed(0);
          return (
            <React.Fragment key={i}>
              <Line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                stroke={colors.border}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <SvgText
                x={PADDING.left - 4}
                y={y + 3}
                fill={colors.textMuted}
                fontSize={9}
                textAnchor="end"
              >
                {value}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Path d={path} stroke={colors.brand} strokeWidth={2} fill="none" />
        {points.map((pt) => (
          <Circle
            key={`${pt.x}-${pt.y}`}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill={colors.brand}
          />
        ))}
      </Svg>
    </View>
  );
}
