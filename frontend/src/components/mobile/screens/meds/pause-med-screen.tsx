'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { Clock } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { FormField } from '@/components/mobile/primitives/form-field';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { getMedicationDetail } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface PauseMedScreenProps {
  theme?: string;
}

export function PauseMedScreen({ theme: themeProp }: PauseMedScreenProps) {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : 'med1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const d = getMedicationDetail(id);

  return (
    <PhoneShell theme={resolvedTheme}>
      <div className="screen-body" style={{ position: 'relative' }}>
        <div style={{ padding: '44px 20px 20px', opacity: 0.3 }}>
          <div style={{ height: 80, borderRadius: 20, background: 'var(--card)' }} />
          <div style={{ height: 200, borderRadius: 16, background: 'var(--card)', marginTop: 12 }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, #000 40%, transparent)' }} />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--bg-elev)',
            borderRadius: '24px 24px 0 0',
            padding: '10px 20px 28px',
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)', margin: '0 auto 14px' }} />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'color-mix(in srgb, var(--warning, #D97706) 14%, transparent)',
              color: 'var(--warning, #D97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={24} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14, letterSpacing: -0.3 }}>Pause {d.name}?</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
            Reminders stop and adherence tracking pauses. You&apos;ll still see it in your history.
          </div>

          <FormField label="Pause for">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 4 }}>
              {['1 day', '3 days', '1 wk', 'Custom'].map((l, i) => (
                <button
                  key={l}
                  type="button"
                  style={{
                    height: 42,
                    borderRadius: 10,
                    background: i === 2 ? 'var(--brand-soft)' : 'var(--card)',
                    border: `1.5px solid ${i === 2 ? 'var(--brand)' : 'var(--border-strong)'}`,
                    color: i === 2 ? 'var(--brand)' : 'var(--ink-2)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Reason (optional)">
            <TextInput placeholder="e.g. side effects, doctor's advice" />
          </FormField>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <FullButton type="button" variant="ghost" onClick={() => { router.push(`/mobile/meds/${id}?${q}`); }}>
              Cancel
            </FullButton>
            <FullButton type="button" style={{ background: 'var(--warning, #D97706)' }} onClick={() => { router.push(`/mobile/meds/${id}?${q}`); }}>
              Pause
            </FullButton>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
