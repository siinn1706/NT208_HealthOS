'use client';

import { Calendar, ChevronLeft } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';

// Step progress: 2 of 5 filled
const STEPS = [1, 1, 0, 0, 0];
const SEX_OPTIONS = [
  { label: 'Male', active: true },
  { label: 'Female', active: false },
  { label: 'Other', active: false },
];

interface HealthProfileSetupScreenProps {
  theme?: string;
}

export function HealthProfileSetupScreen({ theme = 'theme-calm' }: HealthProfileSetupScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={<button className="icon-btn ghost"><ChevronLeft size={20} /></button>}
        title=""
        right={<span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Skip</span>}
      />
      <div className="screen-body" style={{ padding: '0 24px 24px' }}>
        {/* Step progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {STEPS.map((filled, i) => (
            <div
              key={i}
              style={{ flex: 1, height: 3, borderRadius: 2, background: filled ? 'var(--brand)' : 'var(--chip)' }}
            />
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Step 2 · Body basics
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginTop: 6, lineHeight: 1.2 }}>
          Tell us a bit about your body
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
          Only used to personalize insights. You can change this later.
        </div>

        <div style={{ marginTop: 24 }}>
          <FormField label="Birth date">
            <TextInput value="Jul 14, 1993" trailing={<Calendar size={16} />} />
          </FormField>

          <FormField label="Sex at birth">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {SEX_OPTIONS.map(({ label, active }) => (
                <button
                  key={label}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    background: active ? 'var(--brand-soft)' : 'var(--card)',
                    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border-strong)'}`,
                    color: active ? 'var(--brand)' : 'var(--ink-2)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Height">
              <TextInput value="172 cm" />
            </FormField>
            <FormField label="Weight">
              <TextInput value="68 kg" />
            </FormField>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <FullButton>Continue</FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
