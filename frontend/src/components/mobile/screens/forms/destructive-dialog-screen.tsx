'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { AlertTriangle } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface DestructiveDialogScreenProps {
  theme?: string;
}

export function DestructiveDialogScreen({ theme: themeProp }: DestructiveDialogScreenProps) {
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';

  return (
    <PhoneShell theme={resolvedTheme}>
      <div className="screen-body" style={{ position: 'relative' }}>
        <div style={{ padding: '44px 20px 20px', opacity: 0.3 }}>
          <div style={{ height: 220, borderRadius: 16, background: 'var(--card)' }} />
        </div>
        <div
          style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, #000 50%, transparent)' }}
          aria-hidden="true"
        />
        <div
          style={{
            position: 'absolute', top: '32%', left: 20, right: 20,
            background: 'var(--bg-elev)', borderRadius: 20, padding: 22,
            boxShadow: '0 20px 60px color-mix(in srgb, var(--ink) 25%, transparent)',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)',
            color: 'var(--danger, #E54D4D)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginTop: 14, letterSpacing: -0.3 }}>
            Delete this record?
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
            Your BP log entry from Apr 18 will be permanently removed. This cannot be undone.
          </div>

          <div
            className="card"
            style={{ margin: '16px 0', padding: 10, textAlign: 'center', background: 'var(--chip)', border: 'none', fontSize: 12 }}
          >
            <b style={{ color: 'var(--ink)' }}>Apr 18 · 09:12</b> · 132/86 mmHg
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FullButton
              type="button"
              variant="danger"
              onClick={() => { router.push(`/mobile?t=${t}`); }}
            >
              Delete forever
            </FullButton>
            <FullButton
              type="button"
              variant="ghost"
              onClick={() => { router.push(`/mobile?t=${t}`); }}
            >
              Keep it
            </FullButton>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
