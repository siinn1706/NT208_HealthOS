'use client';

import { User, Shield, ChevronLeft } from 'lucide-react';
import { Link } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { useMobileTQuery, useMobileThemeParam } from '@/lib/mobile/use-mobile-theme';

interface ForgotScreenProps {
  theme?: string;
}

export function ForgotScreen({ theme: themeProp }: ForgotScreenProps) {
  const { theme: fromUrl } = useMobileThemeParam();
  const t = useMobileTQuery();
  const theme = themeProp ?? fromUrl;

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
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Reset password</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
          Enter the email linked to your HealthOS account and we&apos;ll send a reset link.
        </div>

        <div style={{ marginTop: 24 }}>
          <FormField label="Email">
            <TextInput type="email" placeholder="you@example.com" leading={<User size={16} />} />
          </FormField>
        </div>

        <Link
          href={`/mobile/auth/otp?${t}`}
          className="btn"
          style={{ width: '100%', textDecoration: 'none', fontWeight: 700, letterSpacing: -0.1, display: 'block', textAlign: 'center' }}
        >
          Send reset link
        </Link>

        <div className="card" style={{ marginTop: 20, padding: 14, display: 'flex', gap: 10 }}>
          <div style={{ color: 'var(--brand)', flexShrink: 0 }}>
            <Shield size={18} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            For your security, reset links expire after 15 minutes. Contact{' '}
            <b>support@healthos.app</b> if you can&apos;t access your email.
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
