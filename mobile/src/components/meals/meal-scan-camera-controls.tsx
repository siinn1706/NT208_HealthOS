import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '../../theme/typography';
import { IconFlash, IconFlip, IconX } from '../../icons';

const BG = '#0B0F14';
const WHITE = '#FFFFFF';

interface MealScanTopBarProps {
  torchEnabled: boolean;
  onBack: () => void;
  onToggleTorch: () => void;
}

export function MealScanTopBar({
  torchEnabled,
  onBack,
  onToggleTorch,
}: MealScanTopBarProps) {
  const { t: i18n } = useTranslation();
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={styles.ghostBtn}
        accessibilityRole="button"
        accessibilityLabel={i18n('common.back')}
        accessibilityHint={i18n('meals.closeScannerHint')}
      >
        <IconX size={20} color={WHITE} />
      </Pressable>
      <Pressable
        onPress={onToggleTorch}
        hitSlop={8}
        style={[styles.ghostBtn, torchEnabled && styles.activeControl]}
        accessibilityRole="button"
        accessibilityLabel={i18n('meals.flash')}
        accessibilityHint={i18n('meals.flashToggleHint')}
        accessibilityState={{ selected: torchEnabled }}
      >
        <IconFlash size={18} color={WHITE} />
      </Pressable>
    </View>
  );
}

interface MealScanBottomControlsProps {
  error: string | null;
  previewUri: string | null;
  uploading: boolean;
  onCapturePhoto: () => void;
  onLaunchLibrary: () => void;
  onToggleCameraFacing: () => void;
}

export function MealScanBottomControls({
  error,
  previewUri,
  uploading,
  onCapturePhoto,
  onLaunchLibrary,
  onToggleCameraFacing,
}: MealScanBottomControlsProps) {
  const { t: i18n } = useTranslation();
  const modes = [i18n('meals.photo'), i18n('meals.multiPhoto'), i18n('meals.manual')];
  return (
    <View style={styles.bottom}>
      {error && (
        <View style={styles.errorChip}>
          <Text style={[typography.caption, { color: WHITE, textAlign: 'center' }]}>{error}</Text>
        </View>
      )}
      <View style={styles.modeTabs}>
        {modes.map((mode, index) => (
          index === 0 ? (
            <View key={mode} style={styles.activeTab}>
              <Text style={[typography.caption, { color: '#111' }]}>{mode}</Text>
            </View>
          ) : (
            <Text key={mode} style={[typography.caption, { color: 'rgba(255,255,255,0.45)' }]}>{mode}</Text>
          )
        ))}
      </View>

      <View style={styles.shutterRow}>
        <View style={styles.shutterSide}>
          <Pressable
            onPress={onLaunchLibrary}
            disabled={uploading}
            style={styles.thumbnail}
            accessibilityRole="button"
            accessibilityLabel={i18n('meals.openPhotoLibrary')}
            accessibilityHint={i18n('meals.openPhotoLibraryHint')}
            accessibilityState={{ disabled: uploading }}
          >
            {previewUri ? <Image source={{ uri: previewUri }} style={styles.thumbnailImage} /> : <View style={styles.thumbnailInner} />}
          </Pressable>
        </View>
        <Pressable
          onPress={onCapturePhoto}
          disabled={uploading}
          style={styles.shutter}
          accessibilityRole="button"
          accessibilityLabel={i18n('meals.takeMealPhoto')}
          accessibilityHint={i18n('meals.takeMealPhotoHint')}
          accessibilityState={{ disabled: uploading }}
        >
          {uploading ? <ActivityIndicator color={BG} /> : <View style={styles.shutterInner} />}
        </Pressable>
        <View style={styles.shutterSide}>
          <Pressable
            onPress={onToggleCameraFacing}
            hitSlop={8}
            style={styles.flipButton}
            accessibilityRole="button"
            accessibilityLabel={i18n('meals.cameraSwitch')}
            accessibilityHint={i18n('meals.cameraSwitchHint')}
          >
            <IconFlip size={24} color={WHITE} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12 },
  ghostBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  activeControl: { backgroundColor: 'rgba(255,255,255,0.28)' },
  bottom: { paddingBottom: 48, paddingHorizontal: 24 },
  errorChip: { backgroundColor: 'rgba(220,38,38,0.9)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  modeTabs: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 28 },
  activeTab: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutterSide: { width: 56, alignItems: 'center' },
  thumbnail: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#5C3D20', overflow: 'hidden' },
  thumbnailInner: { flex: 1, backgroundColor: '#3B2A1A' },
  thumbnailImage: { width: '100%', height: '100%' },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: WHITE },
  flipButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
});
