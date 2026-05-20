import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
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
