import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, withTiming, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableCard({ children, onPress, style, haptic = false }: PressableCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  function handlePressIn() {
    scale.value = withTiming(0.97, { duration: 100 });
    opacity.value = withTiming(0.92, { duration: 100 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 150 });
  }

  function handlePress() {
    if (haptic) Haptics.selectionAsync();
    onPress?.();
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
