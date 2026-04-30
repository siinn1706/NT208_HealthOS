'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { Calendar, Check } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { MedToggle } from '@/components/mobile/screens/parts/toggle';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface ConfirmSheetScreenProps {
  theme?: string;
}

export function ConfirmSheetScreen({ theme: themeProp }: ConfirmSheetScreenProps) {
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';

  return (
    <PhoneShell theme={resolvedTheme}>
      <div className="screen-body" style={{ position: 'relative' }}>
        <div style={{ padding: '44px 20px 20px', opacity: 0.3 }}>
          <div style={{ height: 200, borderRadius: 16, background: 'var(--card)' }} />
        </div>
        <div
          style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, #000 40%, transparent)' }}
          aria-hidden="true"
        />
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--bg-elev)',
            borderRadius: '24px 24px 0 0',
            padding: '10px 20px 28px',
          }}
        >
          <div
            style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)', margin: '0 auto 14px' }}
            aria-hidden="true"
          />
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--brand-soft)',
            color: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={24} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14, letterSpacing: -0.3 }}>
            Book this appointment?
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
            Dr. Nguyen Lan · Friday Apr 26, 11:30 · Video visit. You&apos;ll get a reminder 1 hour before.
          </div>

            <div
              className="card"
            style={{ marginTop: 14, padding: 12, display: 'flex', gap: 10, alignItems: 'center', background: 'var(--chip)', border: 'none' }}
            >
            <Calendar size={16} style={{ color: 'var(--ink-2)' }} aria-hidden="true" />
            <div style={{ flex: 1, fontSize: 12 }} id="confirm-cal-label">
              Also add to your device calendar
            </div>
            <MedToggle on ariaLabelledBy="confirm-cal-label" />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <FullButton
              type="button"
              variant="ghost"
              onClick={() => { router.push(`/mobile?t=${t}`); }}
            >
              Not yet
            </FullButton>
            <FullButton type="button" onClick={() => { router.push(`/mobile?t=${t}`); }}>
              Confirm booking
            </FullButton>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
