import React from 'react';
import { ScrollView, View, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { SCREEN_BOTTOM_CONTENT_INSET, TAB_BAR_CONTENT_HEIGHT } from '../nav/tab-bar-metrics';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padding?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scroll = true, padding = true, style }: ScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const bg = { backgroundColor: t.bg };
  const pad = padding ? { paddingHorizontal: t.space[5] } : undefined;
  // Center content on tablet with a comfortable reading width
  const tabletConstraint: ViewStyle = isTablet
    ? { maxWidth: 600, alignSelf: 'center', width: '100%' }
    : {};

  if (scroll) {
    return (
      <SafeAreaView style={[styles.flex, bg]} edges={['top']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            pad,
            tabletConstraint,
            { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + SCREEN_BOTTOM_CONTENT_INSET },
            style,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, bg]} edges={['top']}>
      <View
        style={[
          styles.flex,
          pad,
          tabletConstraint,
          { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + SCREEN_BOTTOM_CONTENT_INSET },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: {},
});
