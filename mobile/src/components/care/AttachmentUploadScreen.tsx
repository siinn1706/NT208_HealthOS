import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { IconButton } from '../primitives/IconButton';
import { Button } from '../primitives/Button';
import { MissingApiState } from '../api/ApiState';
import { ChevronLeft, ChevronRight, IconPaperclip, IconCamera } from '../../icons';

type ActionSheet = 'library' | 'camera' | null;

export function AttachmentUploadScreen() {
  const t = useTheme();
  const [activeSheet, setActiveSheet] = useState<ActionSheet>(null);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Attachments"
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
        />
      </View>

      <View style={s.content}>
        {/* Main unavailable state */}
        <MissingApiState title="Attachment upload unavailable" contract="unclear and needs manual confirmation" />

        {/* Action rows */}
        <Text style={[typography.h3, { color: t.ink, marginTop: 8, marginBottom: 4 }]}>Add attachments</Text>
        <View style={[s.actionsCard, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
          <Pressable
            style={s.actionRow}
            onPress={() => setActiveSheet('library')}
            accessibilityRole="button"
          >
            <IconPaperclip size={18} color={t.brand} />
            <Text style={[typography.body, { color: t.ink, flex: 1 }]}>Choose from library</Text>
            <ChevronRight size={16} color={t.ink4} />
          </Pressable>

          <View style={[s.divider, { backgroundColor: t.border }]} />

          <Pressable
            style={s.actionRow}
            onPress={() => setActiveSheet('camera')}
            accessibilityRole="button"
          >
            <IconCamera size={18} color={t.brand} />
            <Text style={[typography.body, { color: t.ink, flex: 1 }]}>Take photo</Text>
            <ChevronRight size={16} color={t.ink4} />
          </Pressable>
        </View>
      </View>

      {/* Library dependency sheet */}
      <Modal
        visible={activeSheet === 'library'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSheet(null)}
      >
        <Pressable style={s.backdrop} onPress={() => setActiveSheet(null)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <MissingApiState
            title="Photo library access unavailable"
            contract="requires expo-image-picker dependency and media permissions — not yet configured"
          />
          <Button label="Close" variant="soft" onPress={() => setActiveSheet(null)} style={{ marginTop: 8 }} />
        </View>
      </Modal>

      {/* Camera dependency sheet */}
      <Modal
        visible={activeSheet === 'camera'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSheet(null)}
      >
        <Pressable style={s.backdrop} onPress={() => setActiveSheet(null)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <MissingApiState
            title="Camera access unavailable"
            contract="requires expo-camera dependency and camera permissions — not yet configured"
          />
          <Button label="Close" variant="soft" onPress={() => setActiveSheet(null)} style={{ marginTop: 8 }} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  bar:         { paddingHorizontal: 16 },
  content:     { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  actionsCard: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  actionRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  divider:     { height: StyleSheet.hairlineWidth },
  backdrop:    { flex: 1 },
  sheet:       { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
});
