'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Pill, Clock, Calendar, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { DetailRow } from '@/components/mobile/screens/parts/detail-row';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { CARE_PRESCRIPTION } from '@/lib/mobile/mock/care';

interface PrescriptionDetailScreenProps { theme?: string; }

const ROW_ICONS = {
  dose: Pill,
  freq: Clock,
  dur: Calendar,
  refill: AlertTriangle,
} as const;

export function PrescriptionDetailScreen({ theme: themeProp }: PrescriptionDetailScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const p = CARE_PRESCRIPTION;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Prescription"
        onBack={() => { router.push(`/mobile?${q}`); }}
        right={<button type="button" className="icon-btn" aria-label="More"><MoreHorizontal size={18} /></button>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div className="card" style={{ padding: 18, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{`Prescription · ${p.code}`}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, letterSpacing: -0.3 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{p.issued}</div>
          <div
            style={{
              margin: '18px auto 0',
              width: 120,
              height: 120,
              borderRadius: 12,
              background: 'repeating-linear-gradient(0deg, #000 0 3px, #fff 3px 6px), repeating-linear-gradient(90deg, #000 0 2px, #fff 2px 5px)',
              backgroundBlendMode: 'multiply',
              border: '1px solid var(--border)',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10 }}>Scan at pharmacy</div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {p.rows.map((row, i) => {
            const Ic = ROW_ICONS[row.key];
            return (
              <DetailRow
                key={row.key}
                Icon={Ic}
                label={row.label}
                val={row.value}
                last={i === p.rows.length - 1}
              />
            );
          })}
        </div>

        <div className="card" style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Instructions</div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            {p.instructions}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <FullButton variant="ghost" type="button">Share</FullButton>
          <FullButton type="button">Request refill</FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
