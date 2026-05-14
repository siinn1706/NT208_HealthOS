import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle, IconCheck } from '../../icons';

const BG = '#0B0F14';

type StageStatus = 'done' | 'active' | 'pending';

const STAGES: { label: string; status: StageStatus }[] = [
  { label: 'Detect food',          status: 'done'    },
  { label: 'Estimate portions',    status: 'done'    },
  { label: 'Look up nutrition',    status: 'active'  },
  { label: 'Match to your goals',  status: 'pending' },
];

function StageRow({ label, status }: { label: string; status: StageStatus }) {
  const t = useTheme();
  return (
    <View style={[styles.stageRow, { borderBottomColor: 'rgba(0,0,0,0.08)' }]}>
      <View style={[styles.stageIcon, {
        backgroundColor: status === 'done' ? t.success : status === 'active' ? t.brandSoft : t.bgElev,
        borderColor: status === 'pending' ? 'rgba(0,0,0,0.12)' : 'transparent',
        borderWidth: status === 'pending' ? 1 : 0,
      }]}>
        {status === 'done'   && <IconCheck size={14} color="#fff" />}
        {status === 'active' && <ActivityIndicator size="small" color={t.brand} />}
      </View>
      <Text style={[typography.bodyMed, { color: status === 'pending' ? '#888' : '#111', flex: 1 }]}>{label}</Text>
      {status === 'active' && (
        <Text style={[typography.caption, { color: '#3B82F6' }]}>Working...</Text>
      )}
    </View>
  );
}

// Detection box with floating label above
function DetectionBox({
  label,
  top,
  left,
  right,
  bottom,
  width,
  height,
  borderColor,
}: {
  label: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  width: number;
  height: number;
  borderColor: string;
}) {
  return (
    <View style={{ position: 'absolute', top, left, right, bottom }}>
      {/* Floating label pill */}
      <View style={styles.detectionLabel}>
        <Text style={[typography.micro, { color: '#fff' }]}>{label}</Text>
      </View>
      {/* Border box */}
      <View style={[styles.detectionBox, { width, height, borderColor }]} />
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
        {/* Detection boxes with floating labels */}
        <DetectionBox label="Grilled pork · 92%" top={48} left={52} width={88} height={68} borderColor="#4ADE80" />
        <DetectionBox label="Greens · 84%"       top={78} right={42} width={68} height={52} borderColor="#60A5FA" />
        <DetectionBox label="Rice noodles · 88%" bottom={52} left={70} width={78} height={58} borderColor="#FACC15" />
        {/* Scanning line — cyan glow */}
        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
      </View>

      {/* Bottom sheet — white/light bg */}
      <View style={[styles.sheet, { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.08)' }]}>
        {/* Handle */}
        <View style={[styles.sheetHandle, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
        {/* Header with blue icon square */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerIconSq}>
            <IconSparkle size={20} color="#fff" />
          </View>
          <Text style={[typography.h3, { color: '#111', marginLeft: 10 }]}>Analyzing your plate…</Text>
        </View>
        <View style={styles.stages}>
          {STAGES.map((s) => <StageRow key={s.label} {...s} />)}
        </View>
        {/* Full-width outline cancel button */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.cancelBtn, { borderColor: 'rgba(0,0,0,0.15)' }]}
        >
          <Text style={[typography.button, { color: '#111' }]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  photoArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  plate:          { width: 280, height: 200, borderRadius: 16, backgroundColor: '#1A1208', overflow: 'hidden' },
  blob:           { position: 'absolute', borderRadius: 40, opacity: 0.7 },
  // Detection label pill
  detectionLabel: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2, alignSelf: 'flex-start' },
  detectionBox:   { borderWidth: 2, borderRadius: 4, backgroundColor: 'transparent' },
  // Cyan scan line
  scanLine:       { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(34,211,238,0.8)' },
  sheet:          { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24, paddingBottom: 40 },
  sheetHandle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  // Blue icon square (40x40)
  headerIconSq:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  stages:         { gap: 0, marginBottom: 28 },
  stageRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  stageIcon:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // Full-width outline cancel
  cancelBtn:      { alignItems: 'center', paddingVertical: 14, borderRadius: 100, borderWidth: 1 },
});
