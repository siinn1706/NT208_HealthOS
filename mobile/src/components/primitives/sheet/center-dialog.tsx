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
import { Button } from '../button';

interface CenterDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  /** destructive = confirm button uses danger color, deeper scrim */
  destructive?: boolean;
  /** Optional icon element rendered in a 56×56 tile above title */
  icon?: React.ReactNode;
  /** Optional pill-shaped meta label below icon */
  meta?: string;
  /** Stack actions vertically (destructive first) instead of side-by-side */
  actionsLayout?: 'horizontal' | 'vertical';
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
  icon,
  meta,
  actionsLayout = 'horizontal',
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
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const scrimAlpha = destructive ? 0.5 : 0.4;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${scrimAlpha})` }]}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.dialog,
            animStyle,
            { backgroundColor: t.card, borderRadius: t.radius.xl, ...t.shadows.modal },
          ]}
        >
          <Pressable>
            {/* Icon tile */}
            {icon && (
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconTile,
                    { backgroundColor: destructive ? t.dangerSoft : t.brandSoft, borderRadius: 16 },
                  ]}
                >
                  {icon}
                </View>
              </View>
            )}

            {/* Meta pill */}
            {meta && (
              <View style={styles.metaWrap}>
                <View style={[styles.metaPill, { backgroundColor: t.chip }]}>
                  <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>
                    {meta}
                  </Text>
                </View>
              </View>
            )}

            <Text
              style={[
                typography.h3,
                { color: t.ink, marginBottom: 8, textAlign: icon ? 'center' : 'left' },
              ]}
            >
              {title}
            </Text>
            {message && (
              <Text
                style={[
                  typography.body,
                  { color: t.ink3, marginBottom: 20, textAlign: icon ? 'center' : 'left', lineHeight: 19 },
                ]}
              >
                {message}
              </Text>
            )}
            {children}

            {actionsLayout === 'vertical' ? (
              <View style={styles.actionsVertical}>
                {onConfirm && (
                  <Button
                    label={confirmLabel}
                    variant="solid"
                    size="md"
                    onPress={onConfirm}
                    style={[
                      styles.actionBtnFull,
                      destructive && { backgroundColor: t.danger },
                    ]}
                  />
                )}
                <Button
                  label={cancelLabel}
                  variant="ghost"
                  size="md"
                  onPress={onClose}
                  style={styles.actionBtnFull}
                />
              </View>
            ) : (
              <View style={styles.actionsHorizontal}>
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
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog:          { width: '100%', padding: 22 },
  iconWrap:        { alignItems: 'center', marginBottom: 12 },
  iconTile:        { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  metaWrap:        { alignItems: 'center', marginBottom: 10 },
  metaPill:        { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  actionsVertical: { gap: 8, marginTop: 4 },
  actionBtnFull:   { height: 52 },
  actionsHorizontal: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn:       { flex: 1 },
});
