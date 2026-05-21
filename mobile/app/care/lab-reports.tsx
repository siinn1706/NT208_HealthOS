import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/layout/screen';
import { TopBar } from '../../src/components/layout/top-bar';
import { MissingApiState } from '../../src/components/api/api-state';
import { Button } from '../../src/components/primitives/button';

export default function LabReportsScreen() {
  const { t: i18n } = useTranslation();

  return (
    <Screen>
      <TopBar title={i18n('care.labReports')} />
      <MissingApiState
        title={i18n('care.labReports')}
        contract="Lab reports API not yet available."
      />
      <Button
        label={i18n('common.back')}
        variant="soft"
        style={{ marginHorizontal: 16, marginTop: 12 }}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
