import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Avatar } from '../primitives/Avatar';
import { Chip } from '../primitives/Chip';
import { Card } from '../primitives/Card';
import { IconCheck, IconShield, IconBadge } from '../../icons';

interface IdentityCardProps {
  name: string;
  email?: string;
  age: number;
  gender: string;
  city: string;
  level: number;
  verified: boolean;
}

export function IdentityCard({ name, email, age, gender, city, level, verified }: IdentityCardProps) {
  const t = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.avatarWrap}>
        <Avatar name={name} size={96} />
        {verified && (
          <View style={[styles.badge, { backgroundColor: t.success, borderColor: t.bg }]}>
            <IconCheck size={10} color="#FFF" />
          </View>
        )}
      </View>
      <Text style={[typography.title, { color: t.ink, marginTop: 12, fontWeight: '700', fontSize: 22 }]}>{name}</Text>
      {email && (
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2, fontSize: 13 }]}>{email}</Text>
      )}
      <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
        {age > 0 ? `${age} · ` : ''}{gender} · {city}
      </Text>
      <View style={styles.chips}>
        {verified && (
          <Chip label="Verified" variant="success" icon={<IconShield size={11} color={t.success} />} />
        )}
        <Chip label={`Level ${level}`} variant="brand" icon={<IconBadge size={11} color={t.brand} />} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card:       { alignItems: 'center', marginVertical: 8 },
  avatarWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
