import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { typography } from '../../theme/typography';
import { IconX, IconFlash, IconBarcode, IconFlip } from '../../icons';
import { mealService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';

const BG = '#0B0F14';
const WHITE = '#FFFFFF';

function CornerBracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top    = pos === 'tl' || pos === 'tr';
  const left   = pos === 'tl' || pos === 'bl';
  return (
    <View style={[
      styles.bracket,
      top  ? { top: 0 }    : { bottom: 0 },
      left ? { left: 0 }   : { right: 0 },
      top  ? { borderTopWidth: 3, borderTopColor: WHITE }    : { borderBottomWidth: 3, borderBottomColor: WHITE },
      left ? { borderLeftWidth: 3, borderLeftColor: WHITE }  : { borderRightWidth: 3, borderRightColor: WHITE },
      top && left   ? { borderTopLeftRadius: 6 }    : null,
      top && !left  ? { borderTopRightRadius: 6 }   : null,
      !top && left  ? { borderBottomLeftRadius: 6 } : null,
      !top && !left ? { borderBottomRightRadius: 6 }: null,
    ]} />
  );
}

function inferImageName(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileName) return asset.fileName;
  const ext = asset.mimeType?.split('/')[1] || 'jpg';
  return `meal-scan.${ext === 'jpeg' ? 'jpg' : ext}`;
}

function inferImageType(asset: ImagePicker.ImagePickerAsset) {
  return asset.mimeType || 'image/jpeg';
}

export function MealScanCameraScreen() {
  const router = useRouter();
  const { t: i18n } = useTranslation();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MODES = [i18n('meals.photo'), i18n('meals.multiPhoto'), i18n('meals.manual')];

  async function uploadAsset(asset: ImagePicker.ImagePickerAsset) {
    setPreviewUri(asset.uri);
    setUploading(true);
    setError(null);
    try {
      const meal = await mealService.create({
        name: 'Scanned meal',
        logged_at: new Date().toISOString(),
        image: {
          uri: asset.uri,
          name: inferImageName(asset),
          type: inferImageType(asset),
        },
      });
      invalidateApiQuery('meals.');
      const params = new URLSearchParams({ mealId: meal.id });
      if (meal.job_id) params.set('jobId', meal.job_id);
      router.push(`/meals/scan-analyzing?${params.toString()}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload meal photo.');
    } finally {
      setUploading(false);
    }
  }

  async function launchCamera() {
    if (uploading) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to scan a meal.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAsset(result.assets[0]);
    }
  }

  async function launchLibrary() {
    if (uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload a meal photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAsset(result.assets[0]);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar style="light" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.ghostBtn}>
          <IconX size={20} color={WHITE} />
        </Pressable>
        <View style={styles.topRight}>
          <Pressable hitSlop={8} style={styles.ghostBtn}>
            <IconFlash size={18} color={WHITE} />
          </Pressable>
          <Pressable onPress={() => {}} hitSlop={8} style={styles.ghostBtn}>
            <IconBarcode size={18} color={WHITE} />
          </Pressable>
        </View>
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinder}>
        {/* Hint chip — above the plate */}
        <View style={styles.hintChip}>
          <Text style={[typography.caption, { color: WHITE }]}>✦ {i18n('meals.centerPlate')}</Text>
        </View>

        {/* Realistic food plate composition */}
        <View style={styles.plateBg}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.plate}>
              <View style={[styles.blob, { backgroundColor: '#8B4513', width: 100, height: 70, top: 55, left: 40 }]} />
              <View style={[styles.blob, { backgroundColor: '#D4C5A0', width: 90, height: 40, top: 90, left: 35 }]} />
              <View style={[styles.blob, { backgroundColor: '#4A7C59', width: 60, height: 50, top: 70, right: 30 }]} />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={WHITE} />
              <Text style={[typography.caption, { color: WHITE, marginTop: 8 }]}>Uploading...</Text>
            </View>
          )}
        </View>

        {/* Corner brackets */}
        <View style={styles.bracketFrame}>
          <CornerBracket pos="tl" />
          <CornerBracket pos="tr" />
          <CornerBracket pos="bl" />
          <CornerBracket pos="br" />
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {error && (
          <View style={styles.errorChip}>
            <Text style={[typography.caption, { color: WHITE, textAlign: 'center' }]}>{error}</Text>
          </View>
        )}
        {/* Mode tabs — active "Photo" as white pill */}
        <View style={styles.modeTabs}>
          {MODES.map((m, i) => (
            i === 0 ? (
              <View key={m} style={styles.activeTab}>
                <Text style={[typography.caption, { color: '#111' }]}>{m}</Text>
              </View>
            ) : (
              <Text key={m} style={[typography.caption, { color: 'rgba(255,255,255,0.45)' }]}>{m}</Text>
            )
          ))}
        </View>

        {/* Shutter row with thumbnail on left */}
        <View style={styles.shutterRow}>
          {/* Thumbnail preview placeholder */}
          <View style={styles.shutterSide}>
            <Pressable onPress={launchLibrary} disabled={uploading} style={styles.thumbnail}>
              {previewUri ? <Image source={{ uri: previewUri }} style={styles.thumbnailImage} /> : <View style={styles.thumbnailInner} />}
            </Pressable>
          </View>
          <Pressable
            onPress={launchCamera}
            disabled={uploading}
            style={styles.shutter}
          >
            {uploading ? <ActivityIndicator color={BG} /> : <View style={styles.shutterInner} />}
          </Pressable>
          <View style={styles.shutterSide}>
            <Pressable hitSlop={8}>
              <IconFlip size={24} color={WHITE} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12 },
  topRight:     { flexDirection: 'row', gap: 12 },
  ghostBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  viewfinder:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Hint chip — above plate, top: 24 from viewfinder
  hintChip:     { position: 'absolute', top: 24, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  plateBg:      { width: 260, height: 260, borderRadius: 130, backgroundColor: '#2C1A0E', alignItems: 'center', justifyContent: 'center' },
  plate:        { width: 260, height: 260, borderRadius: 130, backgroundColor: '#F0E6D0', overflow: 'hidden' },
  previewImage: { width: 260, height: 260, borderRadius: 130 },
  blob:         { position: 'absolute', borderRadius: 40 },
  uploadOverlay:{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderRadius: 130 },
  bracketFrame: { position: 'absolute', width: 220, height: 220 },
  bracket:      { position: 'absolute', width: 28, height: 28 },
  bottom:       { paddingBottom: 48, paddingHorizontal: 24 },
  errorChip:    { backgroundColor: 'rgba(220,38,38,0.9)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  modeTabs:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 28 },
  // White pill for active mode tab
  activeTab:    { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  shutterRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutterSide:  { width: 56, alignItems: 'center' },
  // Thumbnail preview
  thumbnail:    { width: 44, height: 44, borderRadius: 10, backgroundColor: '#5C3D20', overflow: 'hidden' },
  thumbnailInner: { flex: 1, backgroundColor: '#3B2A1A' },
  thumbnailImage: { width: '100%', height: '100%' },
  shutter:      { width: 72, height: 72, borderRadius: 36, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: WHITE },
});
