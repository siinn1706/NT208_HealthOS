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
import { ChevronLeft, IconPaperclip, IconCamera, IconCheck, IconX } from '../../icons';

type ActionSheet = 'library' | 'camera' | null;
type UploadState = 'idle' | 'progress' | 'done' | 'error';

interface UploadSlot {
  id: string;
  name: string;
  state: UploadState;
  progress?: number;
}

export function AttachmentUploadScreen() {
  const t = useTheme();
  const [activeSheet, setActiveSheet] = useState<ActionSheet>(null);
  const [slots] = useState<UploadSlot[]>([
    { id: '1', name: 'lab_results.pdf', state: 'done' },
    { id: '2', name: 'xray_scan.png', state: 'progress', progress: 0.62 },
    { id: '3', name: 'referral_letter.pdf', state: 'error' },
  ]);

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
        {/* 2 dashed upload cards */}
        <View style={s.dashedRow}>
          <Pressable
            onPress={() => setActiveSheet('camera')}
            style={[s.dashedCard, { borderColor: t.borderStrong, backgroundColor: t.card, borderRadius: t.radius.lg }]}
          >
            <View style={[s.uploadIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
              <IconCamera size={20} color={t.brand} />
            </View>
            <Text style={[typography.bodyMed, { color: t.ink, marginTop: 8 }]}>Scan document</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2, textAlign: 'center' }]}>Camera or scanner</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSheet('library')}
            style={[s.dashedCard, { borderColor: t.borderStrong, backgroundColor: t.card, borderRadius: t.radius.lg }]}
          >
            <View style={[s.uploadIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
              <IconPaperclip size={20} color={t.brand} />
            </View>
            <Text style={[typography.bodyMed, { color: t.ink, marginTop: 8 }]}>Choose file</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2, textAlign: 'center' }]}>PDF, JPG, PNG</Text>
          </Pressable>
        </View>

        {/* File slots */}
        {slots.length > 0 && (
          <>
            <Text style={[typography.h3, { color: t.ink }]}>Uploads</Text>
            {slots.map((slot) => <UploadRow key={slot.id} slot={slot} />)}
          </>
        )}

        <MissingApiState title="Attachment upload unavailable" contract="unclear and needs manual confirmation" />
      </View>

      {/* Library sheet */}
      <Modal visible={activeSheet === 'library'} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <Pressable style={s.backdrop} onPress={() => setActiveSheet(null)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <MissingApiState title="Photo library access unavailable" contract="requires expo-image-picker and media permissions" />
          <Button label="Close" variant="soft" onPress={() => setActiveSheet(null)} style={{ marginTop: 8 }} />
        </View>
      </Modal>

      {/* Camera sheet */}
      <Modal visible={activeSheet === 'camera'} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <Pressable style={s.backdrop} onPress={() => setActiveSheet(null)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <MissingApiState title="Camera access unavailable" contract="requires expo-camera and camera permissions" />
          <Button label="Close" variant="soft" onPress={() => setActiveSheet(null)} style={{ marginTop: 8 }} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function UploadRow({ slot }: { slot: UploadSlot }) {
  const t = useTheme();
  const stateColor = slot.state === 'done' ? t.success : slot.state === 'error' ? t.danger : t.brand;
  return (
    <View style={[s.uploadRow, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.md }]}>
      <View style={[s.uploadRowIcon, { backgroundColor: stateColor + '18', borderRadius: t.radius.sm }]}>
        {slot.state === 'done' && <IconCheck size={14} color={stateColor} />}
        {slot.state === 'error' && <IconX size={14} color={stateColor} />}
        {(slot.state === 'progress' || slot.state === 'idle') && <IconPaperclip size={14} color={stateColor} />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{slot.name}</Text>
        {slot.state === 'progress' && slot.progress !== undefined && (
          <View style={[s.barTrack, { backgroundColor: t.border }]}>
            <View style={[s.barFill, { width: `${Math.round(slot.progress * 100)}%` as any, backgroundColor: t.brand }]} />
          </View>
        )}
        {slot.state === 'done' && <Text style={[typography.caption, { color: t.success }]}>Uploaded</Text>}
        {slot.state === 'error' && <Text style={[typography.caption, { color: t.danger }]}>Upload failed — tap to retry</Text>}
        {slot.state === 'idle' && <Text style={[typography.caption, { color: t.ink4 }]}>Waiting…</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  dashedRow:    { flexDirection: 'row', gap: 10 },
  dashedCard:   { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', padding: 20, alignItems: 'center', justifyContent: 'center' },
  uploadIcon:   { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  divider:      { height: StyleSheet.hairlineWidth },
  backdrop:     { flex: 1 },
  sheet:        { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  uploadRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  uploadRowIcon:{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  barTrack:     { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill:      { height: 4, borderRadius: 2 },
});
