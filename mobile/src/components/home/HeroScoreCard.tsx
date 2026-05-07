import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProgressRing } from '../charts/ProgressRing';
import { PressableCard } from '../primitives/PressableCard';

interface HeroScoreCardProps {
  value: number;
  target: number;
  copy: string;
  onPress?: () => void;
}

export function HeroScoreCard({ value, target, copy, onPress }: HeroScoreCardProps) {
  const t = useTheme();
  const ratio = value / target;

  const content = (
    <LinearGradient
      colors={[t.brand, t.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: t.radius.xl }]}
    >
      <View style={styles.inner}>
        <View style={styles.text}>
          <Text style={[typography.caption, styles.label]}>TODAY'S HEALTH</Text>
          <Text style={[typography.display, styles.score]}>
            {value}<Text style={styles.scoreTarget}>/{target}</Text>
          </Text>
          <Text style={[typography.caption, styles.copy]}>{copy}</Text>
        </View>
        <ProgressRing
          value={ratio}
          size={84}
          stroke={8}
          color="#FFFFFF"
          track="rgba(255,255,255,0.2)"
        >
          <Text style={[typography.h3, { color: '#FFFFFF' }]}>{value}</Text>
        </ProgressRing>
      </View>
    </LinearGradient>
  );

  if (onPress) {
    return <PressableCard onPress={onPress}>{content}</PressableCard>;
  }
  return content;
}

const styles = StyleSheet.create({
  card:  { marginVertical: 8 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  text:  { flex: 1 },
  label: { color: 'rgba(255,255,255,0.75)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  score: { color: '#FFFFFF', marginBottom: 4 },
  scoreTarget: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  copy:  { color: 'rgba(255,255,255,0.85)' },
});
