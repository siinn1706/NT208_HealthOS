'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { Filter } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { MedHistStat } from '@/components/mobile/screens/parts/hist-stat';
import { MedHistRowView } from '@/components/mobile/screens/parts/hist-row';
import { getMedicationDetail } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface MedicationHistoryScreenProps {
  theme?: string;
}

export function MedicationHistoryScreen({ theme: themeProp }: MedicationHistoryScreenProps) {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : 'med1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const d = getMedicationDetail(id);
  const h = d.historyWeek;
  const intro = d.historyIntro;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title={`History · ${d.name}`}
        onBack={() => { router.push(`/mobile/meds/${id}?${q}`); }}
        right={<button type="button" className="icon-btn" aria-label="Filter"><Filter size={16} /></button>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {intro.periodLabel}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <MedHistStat n={intro.stats.adherence} l="Adherence" c="var(--success, #059669)" />
            <MedHistStat n={intro.stats.taken} l="Doses taken" />
            <MedHistStat n={intro.stats.missed} l="Missed" c="var(--danger, #E54D4D)" />
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: 0.4, margin: '6px 0 10px' }}>THIS WEEK</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {h.thisWeek.map((row, i) => (
            <MedHistRowView
              key={row.date + row.dose}
              date={row.date}
              dose={row.dose}
              state={row.state}
              last={i === h.thisWeek.length - 1}
            />
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: 0.4, margin: '6px 0 10px' }}>LAST WEEK</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {h.lastWeek.map((row, i) => (
            <MedHistRowView
              key={row.date + row.dose}
              date={row.date}
              dose={row.dose}
              state={row.state}
              last={i === h.lastWeek.length - 1}
            />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
