import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

/** Polls connectivity every 5s using a lightweight HEAD request to the API base. */
function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        // Lightweight reachability probe — just needs to resolve
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        await fetch('https://www.gstatic.com/generate_204', {
          method: 'HEAD',
          signal: ctrl.signal,
          cache: 'no-store',
        });
        clearTimeout(timer);
        if (active) setOffline(false);
      } catch {
        if (active) setOffline(true);
      }
    }

    check();
    const interval = setInterval(check, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return offline;
}

export function OfflineBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const translateY = useSharedValue(-80);

  useEffect(() => {
    translateY.value = withTiming(offline ? 0 : -80, { duration: 300 });
  }, [offline]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        animStyle,
        {
          backgroundColor: t.warning,
          top: insets.top,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.inner}>
        <Text style={[typography.caption, styles.icon]}>⚡</Text>
        <Text style={[typography.caption, { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' }]}>
          You're offline — changes may not save
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 0, right: 0, zIndex: 9998 },
  inner:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  icon:   { color: '#FFFFFF' },
});
