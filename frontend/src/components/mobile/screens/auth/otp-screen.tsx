'use client';

import { Shield, ChevronLeft } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { FullButton } from '@/components/mobile/primitives/full-button';

// Static code state: first 3 digits filled, 4th box active with cursor
const OTP_CODE = ['4', '9', '2', '', '', ''];

interface OtpScreenProps {
  theme?: string;
}

export function OtpScreen({ theme = 'theme-calm' }: OtpScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={<button className="icon-btn ghost"><ChevronLeft size={20} /></button>}
        title=""
      />
      <div className="screen-body" style={{ padding: '0 24px 24px' }}>
        {/* Shield icon */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--brand-soft)',
          color: 'var(--brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Shield size={24} />
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 18 }}>Verify it&apos;s you</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
          We sent a 6-digit code to <b style={{ color: 'var(--ink-2)' }}>+84 ••• ••• 847</b>
        </div>

        {/* OTP boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 28 }}>
          {OTP_CODE.map((c, i) => (
            <div
              key={i}
              className="tabular"
              style={{
                aspectRatio: '1 / 1.15',
                borderRadius: 12,
                border: `1.5px solid ${c || i === 3 ? 'var(--brand)' : 'var(--border-strong)'}`,
                background: 'var(--card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--ink)',
                boxShadow: i === 3 ? '0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent)' : 'none',
              }}
            >
              {c || (i === 3 ? (
                <span style={{
                  width: 2,
                  height: 22,
                  background: 'var(--brand)',
                  animation: 'blink 1s steps(2) infinite',
                }} />
              ) : '')}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginTop: 20 }}>
          Didn&apos;t get it?{' '}
          <span style={{ color: 'var(--brand)', fontWeight: 700 }}>Resend in 0:28</span>
        </div>

        <div style={{ marginTop: 28 }}>
          <FullButton>Verify</FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
