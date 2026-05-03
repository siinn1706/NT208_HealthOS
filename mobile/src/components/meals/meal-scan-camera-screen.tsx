import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
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

const MODES = ['Photo', 'Multi-photo', 'Manual'];

export function MealScanCameraScreen() {
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

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
        {/* Faux plate */}
        <View style={styles.plate}>
          <View style={styles.plateInner} />
        </View>

        {/* Corner brackets */}
        <View style={styles.bracketFrame}>
          <CornerBracket pos="tl" />
          <CornerBracket pos="tr" />
          <CornerBracket pos="bl" />
          <CornerBracket pos="br" />
        </View>

        {/* Hint chip */}
        <View style={styles.hintChip}>
          <Text style={[typography.caption, { color: WHITE }]}>Center the plate in the frame</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          {MODES.map((m, i) => (
            <Text key={m} style={[typography.caption, { color: i === 0 ? WHITE : 'rgba(255,255,255,0.45)' }]}>{m}</Text>
          ))}
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <View style={styles.shutterSide} />
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
  root:        { flex: 1 },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12 },
  topRight:    { flexDirection: 'row', gap: 12 },
  ghostBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  viewfinder:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plate:       { width: 260, height: 260, borderRadius: 130, backgroundColor: '#3B2A1A', alignItems: 'center', justifyContent: 'center' },
  plateInner:  { width: 180, height: 180, borderRadius: 90, backgroundColor: '#5C3D20' },
  bracketFrame:{ position: 'absolute', width: 220, height: 220 },
  bracket:     { position: 'absolute', width: 28, height: 28 },
  hintChip:    { position: 'absolute', bottom: 32, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  bottom:      { paddingBottom: 48, paddingHorizontal: 24 },
  modeTabs:    { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 28 },
  shutterRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutterSide: { width: 56, alignItems: 'center' },
  shutter:     { width: 72, height: 72, borderRadius: 36, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  shutterInner:{ width: 58, height: 58, borderRadius: 29, backgroundColor: WHITE },
});
