import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { IconPaperclip, IconSend } from '../../icons';

interface ComposerProps {
  onSend?: (text: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
}

export function Composer({ onSend, onAttach, disabled = false }: ComposerProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [text, setText] = useState('');

  function handleSend() {
    if (disabled || !text.trim()) return;
    onSend?.(text.trim());
    setText('');
  }

  return (
    <View style={[styles.bar, { backgroundColor: t.card, borderTopColor: t.border }]}>
      <Pressable
        style={styles.icon}
        accessibilityLabel={i18n('chat.attachImage')}
        onPress={onAttach}
        disabled={disabled}
      >
        <IconPaperclip size={20} color={disabled ? t.ink4 : t.ink3} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={i18n('chat.messagePlaceholder')}
        placeholderTextColor={t.ink4}
        style={[styles.input, { color: t.ink, backgroundColor: t.bgElev, borderColor: t.border, borderRadius: t.radius.pill }]}
        editable={!disabled}
        multiline
        maxLength={1000}
        blurOnSubmit={false}
      />
      <Pressable
        onPress={handleSend}
        disabled={disabled}
        style={[styles.send, { backgroundColor: disabled ? t.ink4 : t.brand, borderRadius: t.radius.pill }]}
        accessibilityLabel={i18n('chat.sendMessage')}
      >
        <IconSend size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 64, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  icon:  { padding: 4 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, maxHeight: 100, fontSize: 14 },
  send:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
