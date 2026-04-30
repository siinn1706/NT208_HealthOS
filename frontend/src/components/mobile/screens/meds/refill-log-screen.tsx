'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { RefreshCw } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { MedRefillRow } from '@/components/mobile/screens/parts/refill-row';
import { getMedicationDetail } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface RefillLogScreenProps {
  theme?: string;
}

export function RefillLogScreen({ theme: themeProp }: RefillLogScreenProps) {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : 'med1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const d = getMedicationDetail(id);
  const r = d.refill;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar title={`Refills · ${d.name}`} onBack={() => { router.push(`/mobile/meds/${id}?${q}`); }} />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div
          className="card"
          style={{
            padding: 18,
            textAlign: 'center',
            background: 'color-mix(in srgb, var(--warning, #D97706) 10%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--warning, #D97706) 30%, transparent)',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--warning, #D97706)',
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {r.headerTitle}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <span className="tabular" style={{ fontSize: 40, fontWeight: 800 }}>{r.countLarge}</span>
            <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{r.countSub}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <FullButton type="button">
              <RefreshCw size={16} /> Request refill
            </FullButton>
          </div>
        </div>

        <SectionHeader title="History" />
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {r.rows.map((row, i) => (
            <MedRefillRow
              key={row.date}
              date={row.date}
              qty={row.qty}
              src={row.src}
              status={row.status}
              last={i === r.rows.length - 1}
            />
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 14 }}>{r.footer}</div>
      </div>
    </PhoneShell>
  );
}
