import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export type IconButtonVariant = 'filled' | 'ghost';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  variant?: IconButtonVariant;
  dot?: boolean;
  accessibilityLabel: string;
  size?: number;
}

export function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  dot,
  accessibilityLabel,
  size = 40,
}: IconButtonProps) {
  const t = useTheme();
  const bg = variant === 'filled' ? t.brandSoft : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        pressed && styles.pressed,
      ]}
    >
      {icon}
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: t.danger, borderColor: t.bg },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn:     { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
