import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface BadgeProps {
  count?: number;
  dot?: boolean;
  color?: string;
  children: React.ReactNode;
}

export function Badge({ count, dot, color, children }: BadgeProps) {
  const t = useTheme();
  const badgeColor = color ?? t.danger;
  const showBadge = dot || (count !== undefined && count > 0);

  return (
    <View style={styles.wrapper}>
      {children}
      {showBadge && (
        <View
          style={[
            styles.badge,
            dot ? styles.dot : styles.count,
            { backgroundColor: badgeColor },
          ]}
        >
          {!dot && count !== undefined && (
            <Text style={[typography.micro, styles.label]}>
              {count > 99 ? '99+' : String(count)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  badge:   { position: 'absolute', top: -4, right: -4, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  count:   { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4 },
  label:   { color: '#FFFFFF', lineHeight: 18, textAlign: 'center' },
});
