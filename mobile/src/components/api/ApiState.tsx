import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';

interface ApiStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}

export function ApiState({ title, message, actionLabel, onAction, loading }: ApiStateProps) {
  const t = useTheme();

  return (
    <Card style={styles.card}>
      {loading && <ActivityIndicator color={t.brand} />}
      <View style={styles.copy}>
        <Text style={[typography.bodyMed, { color: t.ink, textAlign: 'center' }]}>{title}</Text>
        {message && (
          <Text style={[typography.caption, { color: t.ink3, textAlign: 'center', marginTop: 4 }]}>
            {message}
          </Text>
        )}
      </View>
      {actionLabel && onAction && <Button label={actionLabel} variant="soft" onPress={onAction} />}
    </Card>
  );
}

export function MissingApiState({ title, contract }: { title: string; contract: string }) {
  return (
    <ApiState
      title={title}
      message={`API status: ${contract}. This flow is guarded until the backend contract is confirmed.`}
    />
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, marginVertical: 8 },
  copy: { gap: 2 },
});
