import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { PressableCard } from '../primitives/PressableCard';
import { IconCoffee, IconActivity, IconSparkle, IconHeartPulse } from '../../icons';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  IconCoffee:    IconCoffee,
  IconActivity:  IconActivity,
  IconSparkle:   IconSparkle,
  IconHeartPulse:IconHeartPulse,
};

interface QuickAction {
  id: string;
  label: string;
  icon: string;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  onPress?: (id: string) => void;
}

export function QuickActionGrid({ actions, onPress }: QuickActionGridProps) {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {actions.map((a) => {
        const Icon = ICON_MAP[a.icon];
        const isDanger = a.id === 'sos';
        const bg = isDanger ? `${t.danger}18` : t.brandSoft;
        const color = isDanger ? t.danger : t.brand;
        return (
          <PressableCard
            key={a.id}
            onPress={() => onPress?.(a.id)}
            haptic
            style={[styles.tile, { backgroundColor: bg, borderRadius: t.radius.lg }]}
          >
            {Icon && <Icon size={22} color={color} />}
            <Text style={[typography.micro, { color, marginTop: 6 }]}>{a.label}</Text>
          </PressableCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});
