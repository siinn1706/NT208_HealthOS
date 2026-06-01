import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { PressableCard } from '../primitives/pressable-card';
import { IconCoffee, IconActivity, IconSparkle, IconHeartPulse, IconTrendUp } from '../../icons';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  IconCoffee:     IconCoffee,
  IconActivity:   IconActivity,
  IconSparkle:    IconSparkle,
  IconHeartPulse: IconHeartPulse,
  IconTrendUp:    IconTrendUp,
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
            accessibilityLabel={a.label}
            style={[styles.tile, { backgroundColor: bg, borderRadius: t.radius.lg }]}
          >
            <View style={[styles.iconBox, { backgroundColor: isDanger ? `${t.danger}28` : t.brandSoft }]}>
              {Icon && <Icon size={18} color={color} />}
            </View>
            <Text style={[styles.tileLabel, { color: t.ink }]}>{a.label}</Text>
          </PressableCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid:      { flexDirection: 'row', gap: 10, marginVertical: 4 },
  tile:      { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, gap: 6 },
  iconBox:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 11, fontWeight: '600' },
});
