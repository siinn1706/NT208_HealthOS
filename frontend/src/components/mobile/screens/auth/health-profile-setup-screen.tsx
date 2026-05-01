'use client';

import { Calendar, ChevronLeft } from 'lucide-react';
import { Link } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { useMobileTQuery, useMobileThemeParam } from '@/lib/mobile/use-mobile-theme';

const STEPS = [1, 1, 0, 0, 0] as const;
const SEX_OPTIONS = [
  { label: 'Male' as const, active: true },
  { label: 'Female' as const, active: false },
  { label: 'Other' as const, active: false },
];
const CONDITION_CHIPS = [
  { label: 'None', active: true },
  { label: 'Diabetes', active: false },
  { label: 'Hypertension', active: false },
];

interface HealthProfileSetupScreenProps {
  theme?: string;
}

export function HealthProfileSetupScreen({ theme: themeProp }: HealthProfileSetupScreenProps) {
  const { theme: fromUrl } = useMobileThemeParam();
  const t = useMobileTQuery();
  const theme = themeProp ?? fromUrl;

  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={(
          <Link href={`/mobile/auth/otp?${t}`} className="icon-btn ghost" aria-label="Back" style={{ display: 'flex' }}>
            <ChevronLeft size={20} />
          </Link>
        )}
        title=""
        right={(
          <Link href={`/mobile/onboarding/permissions/notifications?${t}`} style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, textDecoration: 'none' }}>
            Skip
          </Link>
        )}
      />
      <div className="screen-body" style={{ padding: '0 24px 24px' }}>
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
                  type="button"
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

          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: 0.1 }}>
              Conditions (optional)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CONDITION_CHIPS.map((ch) => (
                <button
                  key={ch.label}
                  type="button"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: `1.5px solid ${ch.active ? 'var(--brand)' : 'var(--border-strong)'}`,
                    background: ch.active ? 'var(--brand-soft)' : 'var(--card)',
                    color: ch.active ? 'var(--brand)' : 'var(--ink-2)',
                  }}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <Link
            href={`/mobile/onboarding/permissions/notifications?${t}`}
            className="btn"
            style={{ width: '100%', textDecoration: 'none', fontWeight: 700, letterSpacing: -0.1, display: 'block', textAlign: 'center' }}
          >
            Continue
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
