import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface TopBarProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function TopBar({ title, subtitle, left, right }: TopBarProps) {
  const t = useTheme();

  return (
    <View style={styles.row}>
      {left && <View style={styles.side}>{left}</View>}
      <View style={styles.center}>
        <Text style={[typography.topBarTitle, { color: t.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.topBarSub, { color: t.ink3 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right && <View style={[styles.side, styles.sideRight]}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  center: { flex: 1 },
  side:   { minWidth: 40 },
  sideRight: { alignItems: 'flex-end' },
});
