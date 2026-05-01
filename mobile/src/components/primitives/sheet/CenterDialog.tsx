import React, { useEffect } from 'react';
import { View, Modal, Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { Button } from '../Button';

interface CenterDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  /** destructive = confirm button uses danger color */
  destructive?: boolean;
  children?: React.ReactNode;
}

export function CenterDialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive,
  children,
}: CenterDialogProps) {
  const t = useTheme();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  const ease = Easing.bezier(
    t.motion.easeBezier[0],
    t.motion.easeBezier[1],
    t.motion.easeBezier[2],
    t.motion.easeBezier[3],
  );

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: t.motion.durations.fast, easing: ease });
      scale.value = withTiming(1, { duration: t.motion.durations.fast, easing: ease });
    } else {
      opacity.value = withTiming(0, { duration: t.motion.durations.fast, easing: ease });
      scale.value = withTiming(0.95, { duration: t.motion.durations.fast, easing: ease });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={onClose}>
        <Animated.View
          style={[
            styles.dialog,
            animStyle,
            { backgroundColor: t.card, borderRadius: t.radius.xl, ...t.shadows.modal },
          ]}
        >
          <Pressable>
            <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>{title}</Text>
            {message && (
              <Text style={[typography.body, { color: t.ink3, marginBottom: 20 }]}>{message}</Text>
            )}
            {children}
            <View style={styles.actions}>
              <Button
                label={cancelLabel}
                variant="ghost"
                onPress={onClose}
                style={styles.actionBtn}
              />
              {onConfirm && (
                <Button
                  label={confirmLabel}
                  variant="solid"
                  onPress={onConfirm}
                  style={[
                    styles.actionBtn,
                    destructive && { backgroundColor: t.danger },
                  ]}
                />
              )}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog:  { width: '90%', padding: 24 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1 },
});
