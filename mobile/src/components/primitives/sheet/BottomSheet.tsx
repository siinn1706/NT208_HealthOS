import React, { useEffect } from 'react';
import { View, Modal, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../../theme/useTheme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightRatio?: number;
}

const SCREEN_H = Dimensions.get('window').height;
const DRAG_CLOSE_THRESHOLD = 80;

export function BottomSheet({ visible, onClose, children, maxHeightRatio = 0.85 }: BottomSheetProps) {
  const t = useTheme();
  const maxH = SCREEN_H * maxHeightRatio;

  const translateY = useSharedValue(maxH);
  const scrimOpacity = useSharedValue(0);

  const ease = Easing.bezier(
    t.motion.easeBezier[0],
    t.motion.easeBezier[1],
    t.motion.easeBezier[2],
    t.motion.easeBezier[3],
  );

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: t.motion.durations.sheet, easing: ease });
      scrimOpacity.value = withTiming(1, { duration: t.motion.durations.sheet, easing: ease });
    } else {
      translateY.value = withTiming(maxH, { duration: t.motion.durations.sheet, easing: ease });
      scrimOpacity.value = withTiming(0, { duration: t.motion.durations.sheet, easing: ease });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value * 0.4,
  }));

  const dragGesture = Gesture.Pan()
    .runOnJS(false)
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        scrimOpacity.value = Math.max(0, 1 - e.translationY / maxH);
      }
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_CLOSE_THRESHOLD || e.velocityY > 500) {
        translateY.value = withTiming(maxH, { duration: 200, easing: ease });
        scrimOpacity.value = withTiming(0, { duration: 200, easing: ease });
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200, easing: ease });
        scrimOpacity.value = withTiming(1, { duration: 200, easing: ease });
      }
    });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrimPress} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
        </Pressable>
        <GestureDetector gesture={dragGesture}>
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              {
                backgroundColor: t.card,
                maxHeight: maxH,
                ...t.shadows.sheet,
              },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: t.border }]} />
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  scrimPress: { ...StyleSheet.absoluteFillObject },
  scrim:      { backgroundColor: '#000' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle:     { width: 36, height: 4, borderRadius: 2 },
});
