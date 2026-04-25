import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle } from '../../icons';

interface AiInsightCardProps {
  title: string;
  body: string;
}

export function AiInsightCard({ title, body }: AiInsightCardProps) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.brandSoft, borderRadius: t.radius.lg }]}>
      <View style={styles.header}>
        <IconSparkle size={16} color={t.brand} />
        <Text style={[typography.micro, { color: t.brand, marginLeft: 6 }]}>AI Insight</Text>
      </View>
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 6 }]}>{title}</Text>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { padding: 14, marginVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'center' },
});
