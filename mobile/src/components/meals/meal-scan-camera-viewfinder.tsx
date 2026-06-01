import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { CameraView, type CameraType } from 'expo-camera';
import { typography } from '../../theme/typography';

const WHITE = '#FFFFFF';

function CornerBracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = pos === 'tl' || pos === 'tr';
  const left = pos === 'tl' || pos === 'bl';
  return (
    <View style={[
      styles.bracket,
      top ? { top: 0 } : { bottom: 0 },
      left ? { left: 0 } : { right: 0 },
      top ? { borderTopWidth: 3, borderTopColor: WHITE } : { borderBottomWidth: 3, borderBottomColor: WHITE },
      left ? { borderLeftWidth: 3, borderLeftColor: WHITE } : { borderRightWidth: 3, borderRightColor: WHITE },
      top && left ? { borderTopLeftRadius: 6 } : null,
      top && !left ? { borderTopRightRadius: 6 } : null,
      !top && left ? { borderBottomLeftRadius: 6 } : null,
      !top && !left ? { borderBottomRightRadius: 6 } : null,
    ]} />
  );
}

function PlatePlaceholder() {
  return (
    <View style={styles.plate}>
      <View style={[styles.blob, { backgroundColor: '#8B4513', width: 100, height: 70, top: 55, left: 40 }]} />
      <View style={[styles.blob, { backgroundColor: '#D4C5A0', width: 90, height: 40, top: 90, left: 35 }]} />
      <View style={[styles.blob, { backgroundColor: '#4A7C59', width: 60, height: 50, top: 70, right: 30 }]} />
    </View>
  );
}

interface MealScanCameraViewfinderProps {
  cameraFacing: CameraType;
  cameraRef: React.RefObject<CameraView | null>;
  centerPlateLabel: string;
  hasCameraPermission: boolean;
  loadingLabel: string;
  previewUri: string | null;
  torchEnabled: boolean;
  uploading: boolean;
  onCameraReady: () => void;
  onMountError: (message: string) => void;
}

export function MealScanCameraViewfinder({
  cameraFacing,
  cameraRef,
  centerPlateLabel,
  hasCameraPermission,
  loadingLabel,
  previewUri,
  torchEnabled,
  uploading,
  onCameraReady,
  onMountError,
}: MealScanCameraViewfinderProps) {
  return (
    <View style={styles.viewfinder}>
      <View style={styles.hintChip}>
        <Text style={[typography.caption, { color: WHITE }]}>* {centerPlateLabel}</Text>
      </View>

      <View style={styles.plateBg}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
        ) : hasCameraPermission ? (
          <CameraView
            key={cameraFacing}
            ref={cameraRef}
            style={styles.cameraPreview}
            facing={cameraFacing}
            flash={torchEnabled ? 'on' : 'off'}
            enableTorch={torchEnabled}
            mirror={cameraFacing === 'front'}
            onCameraReady={onCameraReady}
            onMountError={(event) => onMountError(event.message)}
          />
        ) : (
          <PlatePlaceholder />
        )}
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color={WHITE} />
            <Text style={[typography.caption, { color: WHITE, marginTop: 8 }]}>{loadingLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.bracketFrame}>
        <CornerBracket pos="tl" />
        <CornerBracket pos="tr" />
        <CornerBracket pos="bl" />
        <CornerBracket pos="br" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hintChip: { position: 'absolute', top: 24, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  plateBg: { width: 260, height: 260, borderRadius: 130, backgroundColor: '#2C1A0E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  plate: { width: 260, height: 260, borderRadius: 130, backgroundColor: '#F0E6D0', overflow: 'hidden' },
  cameraPreview: { width: 260, height: 260 },
  previewImage: { width: 260, height: 260, borderRadius: 130 },
  blob: { position: 'absolute', borderRadius: 40 },
  uploadOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderRadius: 130 },
  bracketFrame: { position: 'absolute', width: 220, height: 220 },
  bracket: { position: 'absolute', width: 28, height: 28 },
});
