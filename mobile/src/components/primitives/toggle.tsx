import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';

interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

const TRACK_W = 44;
const TRACK_H = 26;
const THUMB = 20;
const OFF_X = 2;
const ON_X = TRACK_W - THUMB - OFF_X;

export function Toggle({ value, onChange, disabled }: ToggleProps) {
  const t = useTheme();
  const thumbX = useSharedValue(value ? ON_X : OFF_X);

  // Sync thumb position when external `value` prop changes
  useEffect(() => {
    thumbX.value = withTiming(value ? ON_X : OFF_X, { duration: 200 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  function handlePress() {
    if (disabled) return;
    onChange(!value);
  }

  const bg = value ? t.brand : t.border;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        backgroundColor: bg,
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Animated.View
        style={[
          {
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: '#FFFFFF',
            ...t.shadows.card,
          },
          thumbStyle,
        ]}
      />
    </Pressable>
  );
}
