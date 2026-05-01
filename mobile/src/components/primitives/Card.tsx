import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface CardProps {
  children: React.ReactNode;
  tight?: boolean;
  style?: ViewStyle;
}

export function Card({ children, tight, style }: CardProps) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg },
        tight && styles.tight,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card:  { padding: 16, borderWidth: StyleSheet.hairlineWidth },
  tight: { padding: 12 },
});
