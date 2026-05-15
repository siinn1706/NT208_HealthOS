import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface DividerProps {
  inset?: number;
}

export function Divider({ inset = 0 }: DividerProps) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.line,
        { backgroundColor: t.border, marginLeft: inset },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: 1 },
});
