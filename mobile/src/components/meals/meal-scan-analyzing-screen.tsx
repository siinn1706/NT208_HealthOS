import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle, IconCheck } from '../../icons';

const BG = '#0B0F14';

type StageStatus = 'done' | 'active' | 'pending';

const STAGES: { label: string; sub: string; status: StageStatus }[] = [
  { label: 'Detect foods',       sub: 'Identifying items on the plate', status: 'done'    },
  { label: 'Estimate portions',  sub: 'Measuring serving sizes',         status: 'active'  },
  { label: 'Fetch nutrition',    sub: 'Looking up macros & micros',      status: 'pending' },
  { label: 'Match goals',        sub: 'Comparing with your daily plan',  status: 'pending' },
];

function StageRow({ label, sub, status }: { label: string; sub: string; status: StageStatus }) {
  const t = useTheme();
  return (
    <View style={styles.stageRow}>
      <View style={[styles.stageIcon, {
        backgroundColor: status === 'done' ? t.success : status === 'active' ? t.brandSoft : t.bgElev,
        borderColor: status === 'pending' ? t.border : 'transparent',
        borderWidth: status === 'pending' ? 1 : 0,
      }]}>
        {status === 'done'   && <IconCheck size={14} color="#fff" />}
        {status === 'active' && <ActivityIndicator size="small" color={t.brand} />}
      </View>
      <View style={styles.stageText}>
        <Text style={[typography.bodyMed, { color: status === 'pending' ? t.ink3 : t.ink }]}>{label}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>{sub}</Text>
      </View>
    </View>
  );
}

export function MealScanAnalyzingScreen() {
  const router = useRouter();
  const t = useTheme();
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    // Auto-navigate after mock delay
    const timer = setTimeout(() => router.push('/meals/scan-results' as never), 4000);
    return () => clearTimeout(timer);
  }, []);

  const translateY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 160] });

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Faux captured photo with scan animation */}
      <View style={styles.photoArea}>
        {/* Dimmed plate */}
        <View style={styles.plate}>
          <View style={[styles.blob, { backgroundColor: '#5C3D20', top: 30, left: 40, width: 90, height: 70 }]} />
          <View style={[styles.blob, { backgroundColor: '#3B5E3A', top: 60, right: 30, width: 70, height: 55 }]} />
          <View style={[styles.blob, { backgroundColor: '#7A4A1E', bottom: 40, left: 60, width: 80, height: 60 }]} />
        </View>
        {/* Detection boxes */}
        <View style={[styles.detectionBox, { top: 48, left: 52, width: 88, height: 68, borderColor: '#4ADE80' }]} />
        <View style={[styles.detectionBox, { top: 78, right: 42, width: 68, height: 52, borderColor: '#60A5FA' }]} />
        <View style={[styles.detectionBox, { bottom: 52, left: 70, width: 78, height: 58, borderColor: '#FACC15' }]} />
        {/* Scanning line */}
        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
      </View>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: t.bgElev, borderColor: t.border }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <IconSparkle size={20} color={t.brand} />
          <Text style={[typography.h3, { color: t.ink, marginLeft: 8 }]}>Analyzing your plate…</Text>
        </View>
        <View style={styles.stages}>
          {STAGES.map((s) => <StageRow key={s.label} {...s} />)}
        </View>
        <Pressable onPress={() => router.back()} style={[styles.cancelBtn, { borderColor: t.border }]}>
          <Text style={[typography.button, { color: t.ink2 }]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  photoArea:     { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  plate:         { width: 280, height: 200, borderRadius: 16, backgroundColor: '#1A1208', overflow: 'hidden' },
  blob:          { position: 'absolute', borderRadius: 40, opacity: 0.7 },
  detectionBox:  { position: 'absolute', borderWidth: 2, borderRadius: 4, backgroundColor: 'transparent' },
  scanLine:      { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  sheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24, paddingBottom: 40 },
  sheetHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  sheetHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stages:        { gap: 16, marginBottom: 28 },
  stageRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stageIcon:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stageText:     { flex: 1, gap: 2 },
  cancelBtn:     { alignItems: 'center', paddingVertical: 14, borderRadius: 100, borderWidth: 1 },
});
