import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconRobot } from '../../icons';
import { withOpacity } from '../../utils/color-mix';

interface AiAssistantHeroProps {
  suggestions: string[];
  onPress?: () => void;
  onSuggestion?: (s: string) => void;
  /** Alias for onSuggestion — preferred going forward */
  onSuggestionPress?: (text: string) => void;
}

export function AiAssistantHero({ suggestions, onPress, onSuggestion, onSuggestionPress }: AiAssistantHeroProps) {
  const t = useTheme();

  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={[t.brandSoft, withOpacity(t.accent, 0.12)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: t.radius.xl, borderColor: t.border }]}
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
            <IconRobot size={24} color={t.brand} />
          </View>
          <View style={styles.info}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>HealthOS AI</Text>
            <View style={styles.online}>
              <View style={[styles.dot, { backgroundColor: t.success }]} />
              <Text style={[typography.micro, { color: t.ink3 }]}>Ready to help · Always private</Text>
            </View>
          </View>
        </View>
        <View style={styles.chips}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => { onSuggestionPress ? onSuggestionPress(s) : onSuggestion?.(s); }}
              style={[styles.chip, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.pill }]}
            >
              <Text style={[typography.micro, { color: t.brand }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:   { padding: 16, borderWidth: StyleSheet.hairlineWidth, marginVertical: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  info:   { flex: 1 },
  online: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dot:    { width: 6, height: 6, borderRadius: 3 },
  chips:  { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  chip:   { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
});
