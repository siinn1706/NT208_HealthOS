import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

interface ChatThreadOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function ChatThreadOptionsModal({
  visible,
  onClose,
  onRefresh,
}: ChatThreadOptionsModalProps) {
  const t = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
          <Text style={[typography.h3, { color: t.ink, marginBottom: 16 }]}>Options</Text>
          <Pressable
            onPress={onRefresh}
            style={[styles.optionBtn, { borderColor: t.border, borderRadius: t.radius.md }]}
          >
            <Text style={[typography.bodyMed, { color: t.ink }]}>Refresh</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={[styles.optionBtn, { borderColor: t.border, borderRadius: t.radius.md, marginTop: 8 }]}
          >
            <Text style={[typography.bodyMed, { color: t.ink3 }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
  optionBtn:    { paddingVertical: 14, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
});
