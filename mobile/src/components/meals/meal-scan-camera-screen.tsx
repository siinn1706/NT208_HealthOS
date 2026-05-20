import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { typography } from '../../theme/typography';
import { IconX, IconFlash, IconBarcode, IconCamera, IconFlip } from '../../icons';

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

export function MealScanCameraScreen() {
  const router = useRouter();
  const { t: i18n } = useTranslation();

  const MODES = [i18n('meals.photo'), i18n('meals.multiPhoto'), i18n('meals.manual')];

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
          {/* Cream plate circle */}
          <View style={styles.plate}>
            {/* Food blob: pork (brown) */}
            <View style={[styles.blob, { backgroundColor: '#8B4513', width: 100, height: 70, top: 55, left: 40 }]} />
            {/* Food blob: noodles (beige) */}
            <View style={[styles.blob, { backgroundColor: '#D4C5A0', width: 90, height: 40, top: 90, left: 35 }]} />
            {/* Food blob: greens (olive) */}
            <View style={[styles.blob, { backgroundColor: '#4A7C59', width: 60, height: 50, top: 70, right: 30 }]} />
          </View>
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
            <View style={styles.thumbnail}>
              <View style={styles.thumbnailInner} />
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/meals/scan-analyzing' as never)}
            style={styles.shutter}
          >
            <View style={styles.shutterInner} />
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
  blob:         { position: 'absolute', borderRadius: 40 },
  bracketFrame: { position: 'absolute', width: 220, height: 220 },
  bracket:      { position: 'absolute', width: 28, height: 28 },
  bottom:       { paddingBottom: 48, paddingHorizontal: 24 },
  modeTabs:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 28 },
  // White pill for active mode tab
  activeTab:    { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  shutterRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutterSide:  { width: 56, alignItems: 'center' },
  // Thumbnail preview
  thumbnail:    { width: 44, height: 44, borderRadius: 10, backgroundColor: '#5C3D20', overflow: 'hidden' },
  thumbnailInner: { flex: 1, backgroundColor: '#3B2A1A' },
  shutter:      { width: 72, height: 72, borderRadius: 36, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: WHITE },
});
