import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle } from '../../icons';
import { PressableCard } from '../primitives/pressable-card';

interface AiInsightCardProps {
  title: string;
  body: string;
  onPress?: () => void;
}

export function AiInsightCard({ title, body, onPress }: AiInsightCardProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const content = (
    <View style={[styles.card, { backgroundColor: t.brandSoft, borderRadius: t.radius.xl }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: t.brand }]}>
          <IconSparkle size={18} color="#FFFFFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={[typography.micro, { color: t.brand }]}>{i18n('home.aiInsight')}</Text>
          <Text style={[typography.bodyMed, { color: t.ink, marginTop: 2 }]}>{title}</Text>
        </View>
      </View>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>{body}</Text>
    </View>
  );

  if (onPress) {
    return <PressableCard onPress={onPress}>{content}</PressableCard>;
  }
  return content;
}

const styles = StyleSheet.create({
  card:       { padding: 16, marginVertical: 4 },
  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerText: { flex: 1 },
});
