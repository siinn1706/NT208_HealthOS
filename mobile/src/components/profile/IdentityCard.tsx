import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Avatar } from '../primitives/Avatar';
import { Chip } from '../primitives/Chip';
import { IconCheck } from '../../icons';

interface IdentityCardProps {
  name: string;
  age: number;
  gender: string;
  city: string;
  level: number;
  verified: boolean;
}

export function IdentityCard({ name, age, gender, city, level, verified }: IdentityCardProps) {
  const t = useTheme();

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        <Avatar name={name} size={84} />
        {verified && (
          <View style={[styles.badge, { backgroundColor: t.success, borderColor: t.bg }]}>
            <IconCheck size={10} color="#FFF" />
          </View>
        )}
      </View>
      <Text style={[typography.title, { color: t.ink, marginTop: 12 }]}>{name}</Text>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
        {age} · {gender} · {city}
      </Text>
      <View style={styles.chips}>
        {verified && <Chip label="Verified" variant="success" />}
        <Chip label={`Level ${level}`} variant="brand" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:       { alignItems: 'center', paddingVertical: 20 },
  avatarWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
