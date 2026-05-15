import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { useRingEntrance } from '../../animations/useRingEntrance';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  value: number;       // 0–1
  size: number;
  stroke?: number;
  color: string;
  track?: string;
  glow?: boolean;      // adds soft color drop-shadow when size >= 72
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size,
  stroke = 6,
  color,
  track = 'rgba(0,0,0,0.08)',
  glow = false,
  children,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;

  const animatedProps = useRingEntrance(value, circumference);

  const glowStyle = glow && size >= 72
    ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 0 }
    : undefined;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, glowStyle]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={cx} cy={cx} r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={cx} cy={cx} r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${cx}, ${cx}`}
        />
      </Svg>
      {children}
    </View>
  );
}
