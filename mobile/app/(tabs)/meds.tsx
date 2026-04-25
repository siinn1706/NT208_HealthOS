import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { SectionHeader } from '../../src/components/layout/SectionHeader';
import { IconButton } from '../../src/components/primitives/IconButton';
import { Card } from '../../src/components/primitives/Card';
import { AdherenceHero } from '../../src/components/meds/AdherenceHero';
import { RefillAlertCard } from '../../src/components/meds/RefillAlertCard';
import { DoseRow } from '../../src/components/meds/DoseRow';
import { MedCard } from '../../src/components/meds/MedCard';
import { IconRefresh, IconPlus } from '../../src/icons';
import { adherence, refillAlert, todayDoses, activeMeds } from '../../src/mocks/meds';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';

export default function MedsScreen() {
  const t = useTheme();

  return (
    <Screen>
      <TopBar
        title="Medications"
        subtitle={`3 active · ${Math.round(adherence.percent * 100)}% adherence`}
        right={
          <View style={styles.actions}>
            <IconButton icon={<IconRefresh size={20} color={t.ink3} />} accessibilityLabel="Refresh" />
            <IconButton icon={<IconPlus size={20} color={t.brand} />} variant="filled" accessibilityLabel="Add medication" />
          </View>
        }
      />

      <AdherenceHero
        percent={adherence.percent}
        taken={adherence.taken}
        total={adherence.total}
        missed={adherence.missed}
      />

      <RefillAlertCard message={refillAlert.message} daysLeft={refillAlert.daysLeft} />

      <SectionHeader title="Today's doses" action="View all" />
      <Card tight>
        {todayDoses.map((dose) => (
          <DoseRow key={dose.id} {...dose} />
        ))}
      </Card>

      <SectionHeader title="Active medications" />
      {activeMeds.map((med) => (
        <MedCard key={med.id} {...med} />
      ))}

      <Text style={[typography.micro, { color: t.ink4, textAlign: 'center', marginTop: 16 }]}>
        Not a substitute for medical advice. Always follow your doctor's instructions.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 4 },
});
