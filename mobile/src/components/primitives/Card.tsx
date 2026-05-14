import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface CardProps {
  children: React.ReactNode;
  tight?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, tight, style }: CardProps) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          padding: tight ? t.space[3] : t.space[5],
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: t.card,
          borderColor: t.border,
          borderRadius: t.radius.lg,
          ...t.shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card:  {},
});
