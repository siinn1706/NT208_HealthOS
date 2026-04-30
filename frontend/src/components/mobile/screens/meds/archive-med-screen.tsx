'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { AlertTriangle } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { getMedicationDetail } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface ArchiveMedScreenProps {
  theme?: string;
}

export function ArchiveMedScreen({ theme: themeProp }: ArchiveMedScreenProps) {
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
          <div style={{ height: 200, borderRadius: 16, background: 'var(--card)' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, #000 45%, transparent)' }} />
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: 20,
            right: 20,
            background: 'var(--bg-elev)',
            borderRadius: 20,
            padding: 22,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)',
              color: 'var(--danger, #E54D4D)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginTop: 14, letterSpacing: -0.3 }}>Archive {d.name}?</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
            This medication will be hidden from your active list and reminders will stop. Your history is preserved
            and you can restore anytime.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <FullButton type="button" style={{ background: 'var(--danger, #E54D4D)' }} onClick={() => { router.push(`/mobile/meds?${q}`); }}>
              Archive medication
            </FullButton>
            <FullButton type="button" variant="ghost" onClick={() => { router.push(`/mobile/meds/${id}?${q}`); }}>
              Cancel
            </FullButton>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
