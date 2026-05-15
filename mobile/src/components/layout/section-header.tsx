import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, action, onActionPress }: SectionHeaderProps) {
  const t = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[typography.h3, { color: t.ink }]}>{title}</Text>
      {action && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={[typography.caption, { color: t.brand }]}>{action}</Text>
        </Pressable>
      ) : action ? (
        <Text style={[typography.caption, { color: t.ink3 }]}>{action}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 20,
  },
});
