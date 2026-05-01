import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { TopBar } from '../layout/TopBar';
import { IconButton } from '../primitives/IconButton';
import { ChevronLeft } from '../../icons';
import { IntakeForm } from './IntakeForm';
import { SymptomsForm } from './SymptomsForm';
import { InsuranceForm } from './InsuranceForm';

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

  if (formId === 'medication') {
    router.replace('/meds/add');
    return null;
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={TITLES[formId]}
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel="Back" />}
        />
      </View>
      {formId === 'intake'    && <IntakeForm />}
      {formId === 'symptoms'  && <SymptomsForm />}
      {formId === 'insurance' && <InsuranceForm />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  bar:  { paddingHorizontal: 16 },
});
