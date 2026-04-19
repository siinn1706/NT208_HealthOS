import React, { useEffect } from "react";
import { Animated, View, type ViewStyle, type StyleProp } from "react-native";
import { useTheme } from "@/theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = React.useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.shimmer,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonRow({ count = 3, gap = 12 }: { count?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={16} />
      ))}
    </View>
  );
}
