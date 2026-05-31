import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Avatar } from '../primitives/avatar';
import type { ChatUserLookupResult } from '../../../../shared/api-contracts';

interface NewChatUserRowProps {
  user: ChatUserLookupResult;
  disabled?: boolean;
  trailingLabel?: string | null;
  trailingActive?: boolean;
  onPress: () => void;
}

export function NewChatUserRow({ user, disabled, trailingLabel, trailingActive, onPress }: NewChatUserRowProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.userRow, { borderBottomColor: t.border }]}
    >
      <Avatar name={user.display_name} size={38} />
      <View style={styles.userBody}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{user.display_name}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>{user.email}</Text>
      </View>
      {trailingLabel ? (
        <Text style={[typography.caption, { color: trailingActive ? t.brand : t.ink4 }]}>
          {trailingLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  userRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  userBody: { flex: 1 },
});
