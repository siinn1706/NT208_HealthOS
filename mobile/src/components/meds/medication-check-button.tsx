import React, { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconCheck } from '../../icons';

interface MedicationCheckButtonProps {
  onTaken?: () => Promise<void> | void;
}

export function MedicationCheckButton({ onTaken }: MedicationCheckButtonProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [taken, setTaken] = useState(false);
  const [saving, setSaving] = useState(false);

  const scale = useSharedValue(1);
  const bgProgress = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgProgress.value === 1 ? t.success : t.brand,
  }));

  async function handlePress() {
    if (taken || saving) return;
    setSaving(true);
    scale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    try {
      await onTaken?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      bgProgress.value = withTiming(1, { duration: 180 }, () => {});
      setTaken(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Pressable onPress={handlePress} disabled={taken || saving}>
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
          <Text style={[typography.micro, { color: '#FFF' }]}>{saving ? i18n('meds.saving') : i18n('meds.take')}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 7, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
});
