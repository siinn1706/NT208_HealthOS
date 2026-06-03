import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export type IconButtonVariant = 'filled' | 'ghost' | 'subtle';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  variant?: IconButtonVariant;
  dot?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: number;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  dot,
  accessibilityLabel,
  accessibilityHint,
  size = 40,
  disabled = false,
}: IconButtonProps) {
  const t = useTheme();
  const bg = variant === 'filled' ? t.brandSoft : variant === 'subtle' ? t.card : 'transparent';
  const borderStyle = variant === 'subtle'
    ? { borderWidth: StyleSheet.hairlineWidth, borderColor: t.border }
    : {};

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      hitSlop={12}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, ...borderStyle },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
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
  pressed:  { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
});
