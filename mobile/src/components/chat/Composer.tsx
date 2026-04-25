import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { IconPaperclip, IconSend } from '../../icons';

interface ComposerProps {
  onSend?: (text: string) => void;
}

export function Composer({ onSend }: ComposerProps) {
  const t = useTheme();
  const [text, setText] = useState('');

  function handleSend() {
    if (!text.trim()) return;
    onSend?.(text.trim());
    setText('');
  }

  return (
    <View style={[styles.bar, { backgroundColor: t.card, borderTopColor: t.border }]}>
      <Pressable style={styles.icon} accessibilityLabel="Attach file">
        <IconPaperclip size={20} color={t.ink3} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Message HealthOS…"
        placeholderTextColor={t.ink4}
        style={[styles.input, { color: t.ink, backgroundColor: t.bgElev, borderColor: t.border, borderRadius: t.radius.pill }]}
        multiline
        maxLength={1000}
        returnKeyType="send"
        onSubmitEditing={handleSend}
      />
      <Pressable
        onPress={handleSend}
        style={[styles.send, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
        accessibilityLabel="Send message"
      >
        <IconSend size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  icon:  { paddingBottom: 8 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, maxHeight: 100, fontSize: 14 },
  send:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
