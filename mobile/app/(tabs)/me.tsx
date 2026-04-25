import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { IconButton } from '../../src/components/primitives/IconButton';
import { Card } from '../../src/components/primitives/Card';
import { Divider } from '../../src/components/primitives/Divider';
import { IdentityCard } from '../../src/components/profile/IdentityCard';
import { StatCell } from '../../src/components/profile/StatCell';
import { EmergencyCard } from '../../src/components/profile/EmergencyCard';
import { MenuGroup } from '../../src/components/profile/MenuGroup';
import { IconSettings, IconCheck } from '../../src/icons';
import { identity, stats, menuGroups } from '../../src/mocks/profile';
import { useTheme } from '../../src/theme/useTheme';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { typography } from '../../src/theme/typography';
import type { ThemeName } from '../../src/theme/tokens';

const THEME_OPTIONS: { key: ThemeName | 'system'; label: string; desc: string }[] = [
  { key: 'calm',   label: 'Calm Clinic',  desc: 'Clean light blues'       },
  { key: 'night',  label: 'Night Sky',    desc: 'Deep dark tones'         },
  { key: 'warm',   label: 'Warm Care',    desc: 'Earthy warm palette'     },
  { key: 'system', label: 'System',       desc: 'Follows device setting'  },
];

function AppearanceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { name, setTheme } = useThemeContext();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
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

export default function MeScreen() {
  const t = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleMenuPress(id: string) {
    if (id === 'appearance') setSheetOpen(true);
  }

  return (
    <>
      <Screen>
        <TopBar
          title="Me"
          right={
            <IconButton
              icon={<IconSettings size={20} color={t.ink3} />}
              accessibilityLabel="Settings"
            />
          }
        />

        <IdentityCard {...identity} />

        <Card style={styles.statsCard}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <Divider />}
              <StatCell label={s.label} value={s.value} />
            </React.Fragment>
          ))}
        </Card>

        <EmergencyCard />

        {menuGroups.map((g) => (
          <MenuGroup key={g.title} title={g.title} items={g.items} onItemPress={handleMenuPress} />
        ))}

        <Text style={[typography.micro, { color: t.ink4, textAlign: 'center', marginTop: 20 }]}>
          NT208 HealthOS · v0.1.0 (mobile)
        </Text>
      </Screen>

      <AppearanceSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  statsCard: { flexDirection: 'row', paddingVertical: 0, paddingHorizontal: 0 },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:     { paddingBottom: 40 },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  themeRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  themeInfo: { flex: 1 },
});
