'use client';

import { Check, ChevronLeft } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';

interface RegisterScreenProps {
  theme?: string;
}

export function RegisterScreen({ theme = 'theme-calm' }: RegisterScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={<button className="icon-btn ghost"><ChevronLeft size={20} /></button>}
        title=""
      />
      <div className="screen-body" style={{ padding: '0 24px 24px' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Create account</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Takes under 2 minutes · Step 1 of 2</div>

        {/* Progress bar */}
        <div style={{ margin: '16px 0 22px', height: 4, background: 'var(--chip)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: '50%', height: '100%', background: 'var(--brand)' }} />
        </div>

        <FormField label="Full name">
          <TextInput placeholder="Minh Nguyen" />
        </FormField>
        <FormField label="Email">
          <TextInput type="email" placeholder="you@example.com" />
        </FormField>
        <FormField label="Password" hint="At least 8 characters with a number">
          <TextInput
            type="password"
            value="••••••••"
            trailing={<Check size={16} style={{ color: 'var(--success, #059669)' }} />}
          />
        </FormField>

        {/* Terms checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 6, marginBottom: 18 }}>
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 1,
          }}>
            <Check size={12} style={{ color: '#fff' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            I agree to the <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Terms</span> and acknowledge the{' '}
            <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Privacy &amp; Health Data Policy</span>
          </div>
        </div>

        <FullButton>Continue</FullButton>
      </div>
    </PhoneShell>
  );
}
