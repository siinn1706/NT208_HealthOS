import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { Button } from '../Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const t = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[typography.h3, { color: t.ink, textAlign: 'center' }]}>{title}</Text>
      {message && (
        <Text style={[typography.body, styles.message, { color: t.ink3 }]}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="soft" onPress={onAction} style={styles.cta} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  iconWrap:  { marginBottom: 4 },
  message:   { textAlign: 'center', lineHeight: 20 },
  cta:       { marginTop: 8, minWidth: 140 },
});
