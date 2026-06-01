import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePressSpring } from '../../animations/usePressSpring';
import { useRipple } from '../../animations/useRipple';
import { useTheme } from '../../theme/useTheme';

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  ripple?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableCard({ children, onPress, style, haptic = false, ripple = false, accessibilityLabel, accessibilityHint }: PressableCardProps) {
  const t = useTheme();
  const press = usePressSpring();
  const rippleAnim = useRipple();

  function handlePress() {
    if (haptic) Haptics.selectionAsync();
    if (ripple) rippleAnim.trigger();
    onPress?.();
  }

  return (
    <AnimatedPressable
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[press.style, style, ripple && styles.overflow]}
    >
      {ripple && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.rippleLayer,
            rippleAnim.style,
            { backgroundColor: t.brand },
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  overflow:    { overflow: 'hidden' },
  rippleLayer: { borderRadius: 999, margin: '25%' },
});
