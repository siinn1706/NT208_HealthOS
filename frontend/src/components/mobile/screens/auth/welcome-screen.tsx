'use client';

import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { Logomark } from '@/components/mobile/primitives/logomark';
import { FullButton } from '@/components/mobile/primitives/full-button';

interface WelcomeScreenProps {
  theme?: string;
}

export function WelcomeScreen({ theme = 'theme-calm' }: WelcomeScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <div className="screen-body" style={{ display: 'flex', flexDirection: 'column', padding: '24px 28px 28px' }}>
        {/* Hero area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 20,
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              inset: -40,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--brand-soft), transparent 70%)',
            }} />
            <Logomark size={96} />
          </div>

          <div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1 }}>
              Your health,<br />in one calm place
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.5, maxWidth: 280 }}>
              Track vitals, manage medications, chat with care — all private, all yours.
            </div>
          </div>

          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: i === 0 ? 22 : 6,
                height: 6,
                borderRadius: 3,
                background: i === 0 ? 'var(--brand)' : 'var(--border-strong)',
                transition: 'width .2s',
              }} />
            ))}
          </div>
        </div>

        {/* CTA area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FullButton>Get started</FullButton>
          <button style={{
            height: 44,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-2)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            I already have an account
          </button>
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.5 }}>
            By continuing, you agree to our Terms &amp; Privacy Policy
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
