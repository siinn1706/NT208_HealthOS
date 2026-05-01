'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Stethoscope, ChevronRight, Calendar, Clock, Video, MapPin } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface CreateAppointmentScreenProps { theme?: string; }

export function CreateAppointmentScreen({ theme: themeProp }: CreateAppointmentScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="New appointment"
        onBack={() => { router.push(`/mobile/care/appointments?${q}`); }}
        right={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>Save</span>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <FormField label="Doctor / Provider">
          <TextInput value="Dr. Nguyen Lan" leading={<Stethoscope size={16} />} />
        </FormField>
        <FormField label="Specialty">
          <TextInput value="Cardiology" trailing={<ChevronRight size={14} />} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Date">
            <TextInput value="Apr 24" leading={<Calendar size={16} />} />
          </FormField>
          <FormField label="Time">
            <TextInput value="11:30" leading={<Clock size={16} />} />
          </FormField>
        </div>
        <FormField label="Type">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ l: 'Video', Ic: Video, on: true }, { l: 'In-person', Ic: MapPin, on: false }].map((x) => (
              <button
                key={x.l}
                type="button"
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: x.on ? 'var(--brand-soft)' : 'var(--card)',
                  border: `1.5px solid ${x.on ? 'var(--brand)' : 'var(--border-strong)'}`,
                  color: x.on ? 'var(--brand)' : 'var(--ink-2)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <x.Ic size={14} /> {x.l}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Reason for visit (optional)">
          <textarea
            placeholder="e.g. Follow-up on BP medication…"
            style={{
              width: '100%',
              minHeight: 80,
              padding: 14,
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              background: 'var(--card)',
              color: 'var(--ink)',
              fontFamily: 'inherit',
              fontSize: 14,
              outline: 'none',
              resize: 'none',
            }}
          />
        </FormField>
        <FormField label="Reminder">
          <TextInput value="1 hour before" trailing={<ChevronRight size={14} />} />
        </FormField>

        <div style={{ marginTop: 8 }}>
          <FullButton type="button">Create appointment</FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
