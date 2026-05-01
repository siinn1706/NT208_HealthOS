import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';

interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

const TRACK_W = 44;
const TRACK_H = 26;
const THUMB = 20;
const OFF_X = 2;
const ON_X = TRACK_W - THUMB - OFF_X;

export function Toggle({ value, onChange }: ToggleProps) {
  const t = useTheme();
  const thumbX = useSharedValue(value ? ON_X : OFF_X);
  const trackBg = useSharedValue(value ? 1 : 0);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(thumbX.value, { duration: 200 }) }],
  }));

  function handlePress() {
    const next = !value;
    thumbX.value = next ? ON_X : OFF_X;
    trackBg.value = next ? 1 : 0;
    onChange(next);
  }

  const bg = value ? t.brand : t.border;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        backgroundColor: bg,
        justifyContent: 'center',
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
