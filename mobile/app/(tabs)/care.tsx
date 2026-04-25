import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { TopBar } from '../../src/components/layout/TopBar';
import { SectionHeader } from '../../src/components/layout/SectionHeader';
import { IconButton } from '../../src/components/primitives/IconButton';
import { WeekStrip } from '../../src/components/care/WeekStrip';
import { SegmentedTabs } from '../../src/components/care/SegmentedTabs';
import { HeroAppointmentCard } from '../../src/components/care/HeroAppointmentCard';
import { AptRow } from '../../src/components/care/AptRow';
import { PrepForVisitCard } from '../../src/components/care/PrepForVisitCard';
import { IconFilter, IconPlus } from '../../src/icons';
import { weekDays, heroAppointment, upcomingAppointments } from '../../src/mocks/appointments';
import { useTheme } from '../../src/theme/useTheme';

const TABS = ['Upcoming', 'Past', 'All'];

export default function CareScreen() {
  const t = useTheme();
  const [tab, setTab] = useState('Upcoming');
  const [selectedDate, setSelectedDate] = useState(24);

  return (
    <Screen>
      <TopBar
        title="Appointments"
        subtitle="2 upcoming · 3 past"
        right={
          <View style={styles.actions}>
            <IconButton icon={<IconFilter size={20} color={t.ink3} />} accessibilityLabel="Filter" />
            <IconButton icon={<IconPlus size={20} color={t.brand} />} variant="filled" accessibilityLabel="New appointment" />
          </View>
        }
      />

      <WeekStrip days={weekDays} selectedDate={selectedDate} onSelect={setSelectedDate} />
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      <HeroAppointmentCard {...heroAppointment} />

      <SectionHeader title="This week" />
      {upcomingAppointments.map((apt) => (
        <AptRow key={apt.id} {...apt} />
      ))}

      <PrepForVisitCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 4 },
});
