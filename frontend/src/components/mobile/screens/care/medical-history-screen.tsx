'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { MiniStat } from '@/components/mobile/screens/parts/mini-stat';
import { TimelineItem } from '@/components/mobile/screens/parts/timeline-item';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { CARE_HISTORY_STATS, CARE_HISTORY_TIMELINE } from '@/lib/mobile/mock/care';

interface MedicalHistoryScreenProps { theme?: string; }

export function MedicalHistoryScreen({ theme: themeProp }: MedicalHistoryScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const q = `t=${t}`;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Medical history"
        onBack={() => { router.push(`/mobile?${q}`); }}
        right={<button type="button" className="icon-btn" aria-label="Filter"><Filter size={16} /></button>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {CARE_HISTORY_STATS.map((s) => (
            <MiniStat key={s.l} n={s.n} l={s.l} />
          ))}
        </div>

        <SectionHeader title="Timeline" />
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          <div
            style={{
              position: 'absolute',
              left: 7,
              top: 12,
              bottom: 12,
              width: 2,
              background: 'var(--border)',
            }}
          />
          {CARE_HISTORY_TIMELINE.map((it, i) => (
            <TimelineItem
              key={`${it.d}-${it.title}-${i}`}
              y={it.year}
              d={it.d}
              title={it.title}
              sub={it.sub}
              tag={it.tag}
              color={it.color}
            />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
