import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { IconButton } from '../primitives/icon-button';
import { MissingApiState } from '../api/api-state';
import {
  ChevronRight, ChevronLeft, IconActivity, IconHeart,
  IconHeartPulse,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { useThemeContext } from '../../theme/theme-provider';
import { typography } from '../../theme/typography';

const HERO_GRADIENTS: Record<string, readonly [string, string]> = {
  calm:  ['#1965B3', '#3A8FD4'],
  night: ['#1A4060', '#0B2030'],
  warm:  ['#8C5A2A', '#C4854A'],
};

const ALL_SOURCES = [
  { id: 'google',    name: 'Google Fit',        sub: 'Steps · Sleep · Heart rate',                Icon: IconActivity,   color: '#0284C7' },
  { id: 'bluetooth', name: 'Bluetooth device',  sub: 'Pair a blood pressure cuff, glucometer or scale', Icon: IconHeartPulse, color: '#1965B3' },
  { id: 'garmin',    name: 'Garmin Connect',    sub: 'GPS run data · Heart rate · VO₂max',        Icon: IconActivity,   color: '#059669' },
  { id: 'samsung',   name: 'Samsung Health',    sub: 'Galaxy Watch · Galaxy Ring',                Icon: IconActivity,   color: '#1428A0' },
  { id: 'manual',    name: 'Manual entry only', sub: 'No device needed — log readings by hand',   Icon: IconHeart,      color: '#8FA5BD' },
];

export function AddDeviceScreen() {
  const t = useTheme();
  const { name: themeName } = useThemeContext();
  const gradient = HERO_GRADIENTS[themeName] ?? HERO_GRADIENTS.calm;
  const [missingOpen, setMissingOpen] = useState(false);

  return (
    <Screen>
      <TopBar
        title="Add data source"
        left={
          <IconButton
            variant="subtle"
            icon={<ChevronLeft size={20} color={t.ink3} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <Text style={[typography.body, { color: t.ink2, marginHorizontal: 16, marginBottom: 16, lineHeight: 22 }]}>
        Connect HealthOS to your existing health apps and devices to sync data automatically.
      </Text>

      {/* Apple Health highlight */}
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIconWrap}>
            <IconHeart size={26} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, fontWeight: '700' }]}>RECOMMENDED</Text>
            <Text style={[typography.title, { color: '#FFF', marginTop: 3, fontSize: 19 }]}>Apple Health</Text>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.85)', marginTop: 2 }]}>
              Steps · Sleep · Heart rate · HRV · Blood O₂
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.heroBtn}
          activeOpacity={0.85}
          onPress={() => setMissingOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Connect Apple Health"
        >
          <Text style={[typography.bodyMed, { color: gradient[0], fontWeight: '700' }]}>
            Connect Apple Health
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <SectionHeader title="All sources" />
      {ALL_SOURCES.map((s) => (
        <TouchableOpacity
          key={s.id}
          style={[styles.sourceRow, { backgroundColor: t.card, borderColor: t.border }]}
          activeOpacity={0.7}
          onPress={() => setMissingOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Connect ${s.name}`}
        >
          <View style={[styles.sourceIcon, { backgroundColor: s.color + '18' }]}>
            <s.Icon size={20} color={s.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700' }]}>{s.name}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 1 }]}>{s.sub}</Text>
          </View>
          <ChevronRight size={15} color={t.ink4} />
        </TouchableOpacity>
      ))}

      {/* Coming-soon modal */}
      <Modal visible={missingOpen} transparent animationType="fade" onRequestClose={() => setMissingOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMissingOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <MissingApiState title="Device integration" contract="Device connection API not yet available." />
            <Pressable
              onPress={() => setMissingOpen(false)}
              style={[styles.modalClose, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[typography.bodyMed, { color: '#FFF' }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard:    { marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 20 },
  heroRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  heroIconWrap:{ width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBtn:     { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  sourceRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1 },
  sourceIcon:  { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:  { width: '100%', padding: 20 },
  modalClose:  { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
