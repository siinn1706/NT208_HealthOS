import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  color?: string;
}

const AVATAR_COLORS = ['#1965B3', '#059669', '#D97706', '#7C3AED', '#B97843'];

function colorFromName(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name = 'U', src, size = 40, color }: AvatarProps) {
  const t = useTheme();
  const bg = color ?? colorFromName(name);
  const fontSize = Math.round(size * 0.36);

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[typography.caption, { color: '#FFFFFF', fontSize }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
