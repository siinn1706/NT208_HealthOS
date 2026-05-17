/**
 * DEV-ONLY: Manual QA playground for all primitive components.
 * Navigate to /dev/primitives to verify every variant in all 3 themes.
 */
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { Button } from '../../src/components/primitives/button';
import { Badge } from '../../src/components/primitives/badge';
import { Input } from '../../src/components/primitives/input/input';
import { Checkbox } from '../../src/components/primitives/input/checkbox';
import { Radio } from '../../src/components/primitives/input/radio';
import { SegmentedControl } from '../../src/components/primitives/input/segmented-control';
import { BottomSheet } from '../../src/components/primitives/sheet/bottom-sheet';
import { CenterDialog } from '../../src/components/primitives/sheet/center-dialog';
import { Skeleton, SkeletonGroup } from '../../src/components/primitives/feedback/skeleton';
import { EmptyState } from '../../src/components/primitives/feedback/empty-state';
import { useToast } from '../../src/components/primitives/feedback/toast';
import { Heart } from 'lucide-react-native';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[typography.h3, { color: t.ink, marginBottom: 12 }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function PrimitivesPlayground() {
  const t = useTheme();
  const toast = useToast();
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState('Calm');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[typography.topBarTitle, { color: t.ink, marginBottom: 4 }]}>Primitives QA</Text>
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 24 }]}>All 3 themes — switch via Me → Preferences</Text>

        <Section title="Button sizes">
          <View style={styles.row}>
            <Button label="Small" size="sm" onPress={() => {}} />
            <Button label="Medium" size="md" onPress={() => {}} />
            <Button label="Large" size="lg" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button label="Ghost" variant="ghost" onPress={() => {}} />
            <Button label="Soft" variant="soft" onPress={() => {}} />
            <Button label="Loading" loading onPress={() => {}} />
          </View>
        </Section>

        <Section title="Input">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={inputVal}
            onChangeText={setInputVal}
          />
          <Input label="Error state" placeholder="..." error="This field is required" value="" />
          <Input label="Disabled" placeholder="Disabled input" disabled value="" />
        </Section>

        <Section title="Controls">
          <View style={styles.row}>
            <Checkbox value={checked} onChange={setChecked} />
            <Text style={[typography.body, { color: t.ink }]}>{checked ? 'Checked' : 'Unchecked'}</Text>
          </View>
          <View style={styles.row}>
            <Radio value={checked} onChange={() => setChecked((v) => !v)} />
            <Text style={[typography.body, { color: t.ink }]}>Radio option</Text>
          </View>
          <SegmentedControl
            options={['Calm', 'Night', 'Warm']}
            value={selected}
            onChange={setSelected}
          />
        </Section>

        <Section title="Badge">
          <View style={styles.row}>
            <Badge count={3}>
              <Button label="Messages" size="sm" variant="soft" onPress={() => {}} />
            </Badge>
            <Badge dot>
              <Button label="Online" size="sm" variant="soft" onPress={() => {}} />
            </Badge>
            <Badge count={100}>
              <Button label="Many" size="sm" variant="soft" onPress={() => {}} />
            </Badge>
          </View>
        </Section>

        <Section title="Skeleton">
          <SkeletonGroup rows={3} />
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
            <Skeleton width={48} height={48} radius={24} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton height={14} width="70%" />
              <Skeleton height={12} width="50%" />
            </View>
          </View>
        </Section>

        <Section title="Empty state">
          <EmptyState
            icon={<Heart size={40} color={t.ink4} />}
            title="No records yet"
            message="Your health records will appear here once you start tracking."
            actionLabel="Get started"
            onAction={() => {}}
          />
        </Section>

        <Section title="Toast">
          <View style={styles.row}>
            <Button label="Success" size="sm" variant="soft" onPress={() => toast.show('Saved!', 'success')} />
            <Button label="Info" size="sm" variant="soft" onPress={() => toast.show('New update available', 'info')} />
            <Button label="Warning" size="sm" variant="soft" onPress={() => toast.show('Low battery', 'warning')} />
            <Button label="Danger" size="sm" variant="soft" onPress={() => toast.show('Upload failed', 'danger')} />
          </View>
        </Section>

        <Section title="Bottom sheet">
          <Button label="Open sheet" onPress={() => setSheetOpen(true)} />
          <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
            <View style={{ padding: 24, gap: 16 }}>
              <Text style={[typography.h3, { color: t.ink }]}>Bottom Sheet</Text>
              <Text style={[typography.body, { color: t.ink3 }]}>Drag down or tap scrim to dismiss.</Text>
              <Button label="Close" variant="ghost" onPress={() => setSheetOpen(false)} />
            </View>
          </BottomSheet>
        </Section>

        <Section title="Center dialog">
          <Button label="Open dialog" onPress={() => setDialogOpen(true)} />
          <CenterDialog
            visible={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Confirm action"
            message="Are you sure you want to proceed? This cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            destructive
            onConfirm={() => setDialogOpen(false)}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  section:   { marginBottom: 28 },
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
});
