import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives/Button';
import { MissingApiState } from '../api/ApiState';

export type FormId = 'insurance' | 'intake' | 'medication' | 'symptoms';

interface FormScreenProps {
  formId: FormId;
}

const TITLES: Record<FormId, string> = {
  insurance:  'Insurance Information',
  intake:     'Patient Intake',
  medication: 'Medication Form',
  symptoms:   'Symptom Checker',
};

export function FormScreen({ formId }: FormScreenProps) {
  const t = useTheme();
  const action = formId === 'medication'
    ? { label: 'Open medication form', onPress: () => router.replace('/meds/add') }
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.back, { color: t.primary }]} onPress={() => router.back()}>
          ← Back
        </Text>
        <Text style={[styles.title, { color: t.ink }]}>{TITLES[formId]}</Text>
        {formId === 'insurance' && (
          <MissingApiState title="Insurance form unavailable" contract="missing API" />
        )}
        {formId === 'symptoms' && (
          <MissingApiState title="Symptom form unavailable" contract="existing API needs adaptation" />
        )}
        {formId === 'intake' && (
          <MissingApiState title="Intake form unavailable" contract="existing API needs adaptation" />
        )}
        {action && <Button label={action.label} onPress={action.onPress} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back:      { fontSize: 15, marginBottom: 16 },
  title:     { fontSize: 26, fontWeight: '700', marginBottom: 8 },
});
