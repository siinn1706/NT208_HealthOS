/**
 * Modal components used exclusively by the Me (profile) tab screen.
 * Extracted to keep me.tsx under 200 lines.
 */
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useThemeContext } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';
import type { ThemeName } from '../../theme/tokens';
import { IconCheck } from '../../icons';
import { ApiState, MissingApiState } from '../api/ApiState';
import { EmergencyCard } from './EmergencyCard';
import { Button } from '../primitives/Button';

// ---------- Shared sheet skeleton ----------
const HANDLE_OFFSET = 12;

function SheetHandle() {
  const t = useTheme();
  return <View style={[styles.handle, { backgroundColor: t.border }]} />;
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.sheetHeader}>
      <Text style={[typography.h3, { color: t.ink }]}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Text style={[typography.caption, { color: t.brand }]}>Close</Text>
      </Pressable>
    </View>
  );
}

// ---------- Appearance sheet ----------
const THEME_OPTIONS: { key: ThemeName | 'system'; label: string; desc: string }[] = [
  { key: 'calm',   label: 'Calm Clinic', desc: 'Clean light blues'      },
  { key: 'night',  label: 'Night Sky',   desc: 'Deep dark tones'        },
  { key: 'warm',   label: 'Warm Care',   desc: 'Earthy warm palette'    },
  { key: 'system', label: 'System',      desc: 'Follows device setting' },
];

export function AppearanceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { name, setTheme } = useThemeContext();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <SheetHandle />
        <Text style={[typography.h3, { color: t.ink, margin: 20, marginBottom: 12 }]}>Appearance</Text>
        {THEME_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => { setTheme(opt.key); onClose(); }}
            style={[styles.themeRow, { borderBottomColor: t.border }]}
          >
            <View style={styles.themeInfo}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{opt.label}</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>{opt.desc}</Text>
            </View>
            {name === opt.key && <IconCheck size={18} color={t.brand} />}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

// ---------- Settings sheet ----------
export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <SheetHandle />
        <SheetHeader title="Settings" onClose={onClose} />
        <Text style={[typography.body, { color: t.ink3, margin: 20, marginTop: 8 }]}>
          General settings will be available here.
        </Text>
      </View>
    </Modal>
  );
}

// ---------- Emergency info sheet ----------
export function EmergencySheet({
  visible,
  onClose,
  onShare,
}: {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <SheetHandle />
        <SheetHeader title="Emergency Info" onClose={onClose} />
        <View style={styles.emergencyPad}>
          <EmergencyCard onShare={onShare} />
        </View>
      </View>
    </Modal>
  );
}

// ---------- Sign-out confirmation ----------
export function SignOutModal({
  visible,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={[styles.overlay, styles.centered]}>
        <View style={[styles.dialog, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
          <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Sign out?</Text>
          <Text style={[typography.body, { color: t.ink3, marginBottom: 20 }]}>
            You will need to sign in again to access your health data.
          </Text>
          {error && (
            <Text style={[typography.caption, { color: t.danger, marginBottom: 12 }]}>{error}</Text>
          )}
          <View style={styles.dialogActions}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.dialogBtn} />
            <Button
              label={loading ? 'Signing out…' : 'Sign out'}
              variant="solid"
              onPress={onConfirm}
              style={[styles.dialogBtn, { backgroundColor: t.danger }]}
            />
          </View>
          {loading && <ActivityIndicator color={t.brand} style={{ marginTop: 12 }} />}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Missing-API placeholder ----------
export function MissingApiModal({
  visible,
  title,
  onClose,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, styles.centered]}>
        <View style={[styles.dialog, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
          <MissingApiState title={title} contract="not yet available" />
          <Button label="Close" variant="ghost" onPress={onClose} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  centered:      { justifyContent: 'center' },
  sheet:         { paddingBottom: 40 },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: HANDLE_OFFSET },
  sheetHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 20, marginBottom: 12 },
  themeRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  themeInfo:     { flex: 1 },
  emergencyPad:  { padding: 16 },
  dialog:        { margin: 24, padding: 24 },
  dialogActions: { flexDirection: 'row', gap: 12 },
  dialogBtn:     { flex: 1 },
});
