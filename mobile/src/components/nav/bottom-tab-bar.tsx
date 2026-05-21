import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme/useTheme';
import { useThemeContext } from '../../theme/theme-provider';
import { Home, IconCalendar, IconChat, IconPill, IconUser } from '../../icons';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { chatService } from '../../api/services';
import { useTabBounce } from '../../animations/usePressSpring';
import { typography } from '../../theme/typography';
import { TAB_BAR_CONTENT_HEIGHT } from './tab-bar-metrics';

const TAB_ICONS = [
  { key: 'home',  Icon: Home,          labelKey: 'nav.home' as const },
  { key: 'care',  Icon: IconCalendar,  labelKey: 'nav.care' as const },
  { key: 'chat',  Icon: IconChat,      labelKey: 'nav.chat' as const },
  { key: 'meds',  Icon: IconPill,      labelKey: 'nav.meds' as const },
  { key: 'me',    Icon: IconUser,      labelKey: 'nav.me'   as const },
];

function TabItem({
  label,
  Icon,
  active,
  badgeCount,
  onPress,
}: {
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  active: boolean;
  badgeCount?: number;
  onPress: () => void;
}) {
  const t = useTheme();
  const bounce = useTabBounce();

  function handlePress() {
    bounce.trigger();
    Haptics.selectionAsync();
    onPress();
  }

  const color = active ? t.brand : t.ink4;

  return (
    <Pressable onPress={handlePress} style={styles.tabItem} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }}>
      <Animated.View style={[styles.iconWrap, bounce.style]}>
        <Icon size={22} color={color} strokeWidth={active ? 2.2 : 1.8} />
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={[styles.badge, { backgroundColor: t.danger }]}>
            <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
          </View>
        )}
      </Animated.View>
      <Text style={[typography.tabLabel, styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { name: themeName } = useThemeContext();
  const insets = useSafeAreaInsets();
  const height = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  const conversations = useApiQuery(queryKeys.conversations, () => chatService.conversations());
  const chatBadge = conversations.data
    ? conversations.data.filter((c) => c.unread_count > 0).length
    : 0;

  return (
    <View style={[styles.container, { height, borderTopColor: t.border }]}>
      {Platform.OS === 'android' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${t.bgElev}EB` }]} />
      ) : (
        <BlurView
          intensity={80}
          tint={themeName === 'night' ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { backgroundColor: `${t.bgElev}EB` }]}
        />
      )}
      <View style={styles.tabs}>
        {TAB_ICONS.map((tab, i) => (
          <TabItem
            key={tab.key}
            label={i18n(tab.labelKey)}
            Icon={tab.Icon}
            active={state.index === i}
            badgeCount={tab.key === 'chat' ? (chatBadge > 0 ? chatBadge : undefined) : undefined}
            onPress={() => navigation.navigate(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  tabs:     { flex: 1, flexDirection: 'row', paddingTop: 10 },
  tabItem:  { flex: 1, alignItems: 'center' },
  iconWrap: { position: 'relative' },
  label:    { marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
});
