'use client';

import { Filter, Plus } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { TabBar } from '@/components/mobile/shell/tab-bar';
import { ApptCard } from '@/components/mobile/screens/parts/appt-card';
import { APPOINTMENTS } from '@/lib/mobile/mock/care';

const TABS = [
  { label: 'Up',      active: true  },
  { label: 'In prog', active: false },
  { label: 'Past',    active: false },
  { label: 'All',     active: false },
];

interface AppointmentsRefinedScreenProps {
  theme?: string;
}

export function AppointmentsRefinedScreen({ theme = 'theme-calm' }: AppointmentsRefinedScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        title="Care"
        subtitle="Appointments · Prep · History"
        right={
          <>
            <button className="icon-btn"><Filter size={18}/></button>
            <button className="icon-btn" style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}>
              <Plus size={18}/>
            </button>
          </>
        }
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        {/* Filter tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
          padding: 4, background: 'var(--chip)', borderRadius: 12, marginBottom: 14,
        }}>
          {TABS.map(({ label, active }, i) => (
            <button key={i} style={{
              padding: '8px 0', borderRadius: 9, border: 'none',
              background: active ? 'var(--card)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>

        {APPOINTMENTS.map((apt) => (
          <ApptCard key={apt.id} status={apt.status} name={apt.name} meta={apt.meta} time={apt.time}/>
        ))}
      </div>
      <TabBar active="care"/>
    </PhoneShell>
  );
}
