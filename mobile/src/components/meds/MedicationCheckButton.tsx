import React, { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconCheck } from '../../icons';

interface MedicationCheckButtonProps {
  onTaken?: () => void;
}

export function MedicationCheckButton({ onTaken }: MedicationCheckButtonProps) {
  const t = useTheme();
  const [taken, setTaken] = useState(false);

  const scale = useSharedValue(1);
  const bgProgress = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgProgress.value === 1 ? t.success : t.brand,
  }));

  function handlePress() {
    if (taken) return;
    scale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    bgProgress.value = withTiming(1, { duration: 180 }, () => {});
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTaken(true);
      onTaken?.();
    }, 300);
  }

  return (
    <Pressable onPress={handlePress} disabled={taken}>
      <Animated.View
        style={[
          styles.btn,
          { borderRadius: t.radius.pill },
          animStyle,
          taken && { backgroundColor: t.success },
        ]}
      >
        {taken ? (
          <IconCheck size={16} color="#FFF" />
        ) : (
          <Text style={[typography.micro, { color: '#FFF' }]}>Take</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 7, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
});
