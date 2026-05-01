'use client';

import { Shield, ChevronLeft } from 'lucide-react';
import { Link } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { useMobileTQuery, useMobileThemeParam } from '@/lib/mobile/use-mobile-theme';

/** Static demo: first input visually “focused” with blinking cursor. */
const OTP_CODE = ['', '', '', '', '', ''];

interface OtpScreenProps {
  theme?: string;
}

export function OtpScreen({ theme: themeProp }: OtpScreenProps) {
  const { theme: fromUrl } = useMobileThemeParam();
  const t = useMobileTQuery();
  const theme = themeProp ?? fromUrl;
  const FOCUS_INDEX = 0;

  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={(
          <Link href={`/mobile/auth/login?${t}`} className="icon-btn ghost" aria-label="Back" style={{ display: 'flex' }}>
            <ChevronLeft size={20} />
          </Link>
        )}
        title=""
      />
      <div className="screen-body" style={{ padding: '0 24px 24px' }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--brand-soft)',
          color: 'var(--brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        >
          <Shield size={24} />
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 18 }}>Verify it&apos;s you</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
          We sent a 6-digit code to <b style={{ color: 'var(--ink-2)' }}>+84 ••• ••• 847</b>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 28 }}>
          {OTP_CODE.map((c, i) => {
            const isFocus = i === FOCUS_INDEX;
            return (
              <div
                key={i}
                className="tabular"
                style={{
                  aspectRatio: '1 / 1.15',
                  borderRadius: 12,
                  border: `1.5px solid ${c || isFocus ? 'var(--brand)' : 'var(--border-strong)'}`,
                  background: 'var(--card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  boxShadow: isFocus ? '0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent)' : 'none',
                }}
              >
                {c || (isFocus ? (
                  <span
                    aria-hidden
                    style={{
                      width: 2,
                      height: 22,
                      background: 'var(--brand)',
                      animation: 'blink 1s steps(2) infinite',
                    }}
                  />
                ) : '')}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginTop: 20 }}>
          Didn&apos;t get it?{' '}
          <span style={{ color: 'var(--brand)', fontWeight: 700 }}>Resend in 0:28</span>
        </div>

        <div style={{ marginTop: 28 }}>
          <Link
            href={`/mobile/onboarding/profile?${t}`}
            className="btn"
            style={{ width: '100%', textDecoration: 'none', fontWeight: 700, letterSpacing: -0.1, display: 'block', textAlign: 'center' }}
          >
            Verify
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
