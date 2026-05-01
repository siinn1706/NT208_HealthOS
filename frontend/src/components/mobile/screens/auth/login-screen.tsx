'use client';

import { User, Lock, ChevronLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { Logomark } from '@/components/mobile/primitives/logomark';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface LoginScreenProps {
  theme?: string;
  /** When true, show password error state. Can be driven by `?error=1`. */
  error?: boolean;
}

export function LoginScreen({ theme: themeProp, error: errorProp }: LoginScreenProps) {
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get('error') === '1';
  const error = errorProp ?? fromQuery;
  const theme = themeProp ?? themeClass(parseTheme(searchParams.get('t')));
  const t = parseTheme(searchParams.get('t'));
  const q = `t=${t}`;

  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={(
          <Link href={`/mobile?${q}`} className="icon-btn ghost" aria-label="Back" style={{ display: 'flex' }}>
            <ChevronLeft size={20} />
          </Link>
        )}
        title=""
      />
      <div className="screen-body" style={{ padding: '0 24px 24px' }}>
        <Logomark size={44} />
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 18 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Sign in to continue to HealthOS</div>

        <div style={{ marginTop: 24 }}>
          <FormField label="Email">
            <TextInput type="email" value="minh.nguyen@example.com" leading={<User size={16} />} />
          </FormField>

          <FormField label="Password" error={error ? "Password doesn't match our records" : undefined}>
            <TextInput
              type="password"
              value={error ? 'incorrect' : '••••••••••'}
              leading={<Lock size={16} />}
              error={error}
              trailing={<span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700 }}>Show</span>}
            />
          </FormField>

          <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, marginTop: -4, marginBottom: 18 }}>
            <Link href={`/mobile/auth/forgot?${q}`} style={{ color: 'var(--brand)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <FullButton type="button">Sign in</FullButton>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>OR CONTINUE WITH</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" className="btn ghost" style={{ height: 46, fontSize: 13 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2h-10v4.1h5.7c-.2 1.3-1 2.5-2.1 3.2v2.7h3.4c2-1.9 3.2-4.6 3.2-7.8z" />
                <path fill="#34A853" d="M12.3 23c2.9 0 5.3-1 7-2.6L15.9 17.7c-1 .6-2.1 1-3.6 1-2.7 0-5.1-1.9-5.9-4.3H2.8v2.7C4.6 20.9 8.2 23 12.3 23z" />
                <path fill="#FBBC04" d="M6.4 14.4c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.7H2.8C2 9.1 1.6 10.5 1.6 12s.4 2.9 1.2 4.3l3.6-1.9z" />
                <path fill="#EA4335" d="M12.3 5.4c1.5 0 2.9.5 4 1.5L19.4 4c-1.9-1.8-4.3-2.8-7.1-2.8C8.2 1.2 4.6 3.5 2.8 7L6.4 9.7c.8-2.4 3.2-4.3 5.9-4.3z" />
              </svg>
              Google
            </button>
            <button type="button" className="btn ghost" style={{ height: 46, fontSize: 13 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.05 12.5c0-2.4 2-3.6 2-3.7-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.2-2.8.8-3.6.8-.8 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.9 2.4-1.6 2.9-.4 7 1.2 9.4.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.2 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6 0-.1-2.2-.9-2.2-3.3zM14.6 5.5c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 2.9 1.1.1 2.2-.6 2.9-1.4z" />
              </svg>
              Apple
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 24 }}>
            New here?{' '}
            <Link href={`/mobile/auth/register?${q}`} style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>
              Create account
            </Link>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
