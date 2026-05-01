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
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size,
  stroke = 4,
  color,
  track = 'rgba(0,0,0,0.08)',
  children,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;

  const animatedProps = useRingEntrance(value, circumference);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
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
