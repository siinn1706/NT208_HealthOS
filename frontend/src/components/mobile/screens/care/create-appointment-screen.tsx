'use client';

import { Stethoscope, ChevronRight, Calendar, Clock, Video, MapPin } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';

const VISIT_TYPES = [
  { label: 'Video',      Icon: Video,  selected: true  },
  { label: 'In-person',  Icon: MapPin, selected: false },
];

interface CreateAppointmentScreenProps {
  theme?: string;
}

export function CreateAppointmentScreen({ theme = 'theme-calm' }: CreateAppointmentScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <BackBar
        title="New appointment"
        right={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>Save</span>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <FormField label="Doctor / Provider">
          <TextInput value="Dr. Nguyen Lan" leading={<Stethoscope size={16}/>}/>
        </FormField>

        <FormField label="Specialty">
          <TextInput value="Cardiology" trailing={<ChevronRight size={14}/>}/>
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Date">
            <TextInput value="Apr 24" leading={<Calendar size={16}/>}/>
          </FormField>
          <FormField label="Time">
            <TextInput value="11:30" leading={<Clock size={16}/>}/>
          </FormField>
        </div>

        <FormField label="Type">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {VISIT_TYPES.map(({ label, Icon, selected }) => (
              <button key={label} style={{
                height: 48, borderRadius: 12,
                background: selected ? 'var(--brand-soft)' : 'var(--card)',
                border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border-strong)'}`,
                color: selected ? 'var(--brand)' : 'var(--ink-2)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Icon size={14}/> {label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Reason for visit (optional)">
          <textarea placeholder="e.g. Follow-up on BP medication…" style={{
            width: '100%', minHeight: 80, padding: 14,
            border: '1px solid var(--border-strong)', borderRadius: 12,
            background: 'var(--card)', color: 'var(--ink)',
            fontFamily: 'inherit', fontSize: 14, outline: 'none', resize: 'none',
            boxSizing: 'border-box',
          }}/>
        </FormField>

        <FormField label="Reminder">
          <TextInput value="1 hour before" trailing={<ChevronRight size={14}/>}/>
        </FormField>

        <div style={{ marginTop: 8 }}>
          <FullButton>Create appointment</FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
