import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProgressRing } from '../charts/progress-ring';
import { PressableCard } from '../primitives/pressable-card';

interface HeroScoreCardProps {
  value: number;
  target: number;
  copy: string;
  onPress?: () => void;
}

export function HeroScoreCard({ value, target, copy, onPress }: HeroScoreCardProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const ratio = value / target;

  const content = (
    <LinearGradient
      colors={[t.brand, t.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: t.radius.xl }]}
    >
      {/* Decorative glow circles — pointer-events none so they don't block touch */}
      <View pointerEvents="none" style={styles.glowCircle1} />
      <View pointerEvents="none" style={styles.glowCircle2} />
      <View style={styles.inner}>
        <View style={styles.text}>
          <Text style={[typography.caption, styles.label]}>{i18n('home.todaysHealth')}</Text>
          <Text style={[typography.display, styles.score]}>
            {value}<Text style={styles.scoreTarget}>/{target}</Text>
          </Text>
          <Text style={[typography.caption, styles.copy]}>{copy}</Text>
        </View>
        <ProgressRing
          value={ratio}
          size={74}
          stroke={7}
          color="#FFFFFF"
          track="rgba(255,255,255,0.2)"
          glow={true}
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
  card:         { marginVertical: 8, overflow: 'hidden' },
  glowCircle1:  { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)', right: -40, top: -40 },
  glowCircle2:  { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)', right: 20, top: 50 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  text:  { flex: 1 },
  label: { color: 'rgba(255,255,255,0.75)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  score: { color: '#FFFFFF', marginBottom: 4 },
  scoreTarget: { ...typography.h3, color: 'rgba(255,255,255,0.7)' },
  copy:  { color: 'rgba(255,255,255,0.85)' },
});
