'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { Pill } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { getMedicationDetail } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface TakeMedConfirmScreenProps {
  theme?: string;
}

/** Confirm / skip for an upcoming dose — large pill icon, dose copy, two actions. */
export function TakeMedConfirmScreen({ theme: themeProp }: TakeMedConfirmScreenProps) {
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
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, #000 30%, transparent)' }} />
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
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)', margin: '0 auto 18px' }} />
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--success, #059669) 14%, transparent)',
                color: 'var(--success, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 0 0 8px color-mix(in srgb, var(--success, #059669) 8%, transparent)',
              }}
            >
              <Pill size={44} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 16, letterSpacing: -0.3 }}>Log this dose?</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>{d.takeConfirm.doseLine}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{d.takeConfirm.scheduledLine}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <FullButton
              type="button"
              variant="ghost"
              onClick={() => { router.push(`/mobile/meds/${id}?${q}`); }}
            >
              Skip
            </FullButton>
            <FullButton
              type="button"
              onClick={() => { router.push(`/mobile/meds/${id}?${q}`); }}
            >
              Confirm
            </FullButton>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
