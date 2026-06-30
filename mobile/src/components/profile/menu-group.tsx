import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { MenuRow } from './menu-row';
import { Card } from '../primitives/card';
import {
  IconUser, IconActivity, IconHeartPulse, IconTarget, IconShield,
  IconLock, IconBell, IconGlobe, IconSun, IconLogOut,
} from '../../icons';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  IconUser:       IconUser,
  IconActivity:   IconActivity,
  IconHeartPulse: IconHeartPulse,
  IconTarget:     IconTarget,
  IconShield:     IconShield,
  IconLock:       IconLock,
  IconBell:       IconBell,
  IconGlobe:      IconGlobe,
  IconSun:        IconSun,
  IconLogOut:     IconLogOut,
};

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  type: 'nav' | 'toggle' | 'danger';
  val?: string;
  defaultVal?: boolean;
}

interface MenuGroupProps {
  title: string;
  items: MenuItem[];
  onItemPress?: (id: string) => void;
}

export function MenuGroup({ title, items, onItemPress }: MenuGroupProps) {
  const t = useTheme();

  return (
    <View style={styles.group}>
      <Text style={[typography.micro, { color: t.ink3, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 }]}>
        {title.toUpperCase()}
      </Text>
      <Card tight style={styles.card}>
        {items.map((item, i) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <MenuRow
              key={item.id}
              label={item.label}
              icon={Icon ? <Icon size={18} color={item.type === 'danger' ? t.danger : t.brand} /> : <></>}
              type={item.type}
              val={item.val}
              defaultVal={item.defaultVal}
              onPress={() => onItemPress?.(item.id)}
              showDivider={i < items.length - 1}
              testID={`profile-${item.id}-row`}
            />
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginVertical: 8 },
  card:  { paddingHorizontal: 12 },
});
