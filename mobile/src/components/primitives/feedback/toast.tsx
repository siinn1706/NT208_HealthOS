import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastBanner({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const t = useTheme();
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  const ease = Easing.bezier(
    t.motion.easeBezier[0],
    t.motion.easeBezier[1],
    t.motion.easeBezier[2],
    t.motion.easeBezier[3],
  );

  const dismiss = useCallback(() => onDismiss(item.id), [item.id, onDismiss]);

  React.useEffect(() => {
    // Slide in
    translateY.value = withTiming(0, { duration: t.motion.durations.base, easing: ease });
    opacity.value = withTiming(1, { duration: t.motion.durations.base, easing: ease });
    // Auto dismiss after 3s
    translateY.value = withDelay(3000, withTiming(-80, { duration: t.motion.durations.base, easing: ease }));
    opacity.value = withDelay(3000, withTiming(0, { duration: t.motion.durations.base, easing: ease }, (finished) => {
      if (finished) runOnJS(dismiss)();
    }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const variantColor: Record<ToastVariant, string> = {
    success: t.success,
    info:    t.brand,
    warning: t.warning,
    danger:  t.danger,
  };

  return (
    <Animated.View style={[styles.banner, animStyle, { backgroundColor: t.card, ...t.shadows.floating }]}>
      <View style={[styles.accent, { backgroundColor: variantColor[item.variant] }]} />
      <Text style={[typography.bodyMed, styles.msg, { color: t.ink }]} numberOfLines={2}>
        {item.message}
      </Text>
      <Pressable onPress={dismiss} style={styles.close}>
        <Text style={[typography.caption, { color: t.ink4 }]}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Dismiss all toasts on navigation
  useEffect(() => {
    setToasts([]);
  }, [pathname]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    setToasts((prev) => {
      // Dedup: skip if identical toast already visible
      if (prev.some((t) => t.message === message && t.variant === variant)) return prev;
      const id = String(++counter.current);
      return [...prev.slice(-2), { id, message, variant }];
    });
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={[styles.stack, { top: insets.top + 12 }]} pointerEvents="box-none">
        {toasts.map((item) => (
          <ToastBanner key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  stack:  { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 9999 },
  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, overflow: 'hidden', minHeight: 52 },
  accent: { width: 4, alignSelf: 'stretch' },
  msg:    { flex: 1, paddingHorizontal: 12, paddingVertical: 14 },
  close:  { paddingHorizontal: 12, paddingVertical: 14 },
});
