import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { Button } from '../primitives/button';
import { MissingApiState } from '../api/api-state';
import { BottomSheet } from '../primitives/sheet/bottom-sheet';
import { ChevronLeft, IconPaperclip, IconCamera } from '../../icons';

type ActionSheet = 'library' | 'camera' | null;

export function AttachmentUploadScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeSheet, setActiveSheet] = useState<ActionSheet>(null);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('care.attachments')}
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel={i18n('common.back')}
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

        <MissingApiState
          title="Attachment upload unavailable"
          contract="Generic appointment upload/storage API is not implemented; prescription files use the separate prescription asset contract."
        />
      </View>

      <BottomSheet visible={activeSheet === 'library'} onClose={() => setActiveSheet(null)}>
        <View style={[s.sheetInner, { paddingBottom: insets.bottom + 16 }]}>
          <MissingApiState title="Photo library access unavailable" contract="requires expo-image-picker and media permissions" />
          <Button label={i18n('common.close')} variant="soft" onPress={() => setActiveSheet(null)} style={{ marginTop: 8 }} />
        </View>
      </BottomSheet>

      <BottomSheet visible={activeSheet === 'camera'} onClose={() => setActiveSheet(null)}>
        <View style={[s.sheetInner, { paddingBottom: insets.bottom + 16 }]}>
          <MissingApiState title="Camera access unavailable" contract="requires expo-camera and camera permissions" />
          <Button label={i18n('common.close')} variant="soft" onPress={() => setActiveSheet(null)} style={{ marginTop: 8 }} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  dashedRow:    { flexDirection: 'row', gap: 10 },
  dashedCard:   { flex: 1, borderWidth: 1.5, borderStyle: 'solid', padding: 24, alignItems: 'center', justifyContent: 'center' },
  uploadIcon:   { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  divider:      { height: StyleSheet.hairlineWidth },
  sheetInner:   { paddingHorizontal: 20, paddingTop: 8 },
});
