'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { ChecklistRow } from '@/components/mobile/screens/parts/checklist-row';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { CARE_VISIT_PREP } from '@/lib/mobile/mock/care';

interface VisitPrepScreenProps { theme?: string; }

export function VisitPrepScreen({ theme: themeProp }: VisitPrepScreenProps) {
  const params = useParams();
  const paramsId = params?.id;
  const id = typeof paramsId === 'string' ? paramsId : 'apt1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const p = CARE_VISIT_PREP;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Visit prep"
        onBack={() => { router.push(`/mobile/care/appointments/${id}?${q}`); }}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, var(--brand-soft) 0%, color-mix(in srgb, var(--accent) 20%, var(--card)) 100%)',
            border: 'none',
            padding: 16,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{p.eyebrow}</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, letterSpacing: -0.3 }}>{p.doctorName}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{p.meta}</div>
          <div style={{ height: 5, background: 'var(--card)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${p.progressPct}%`, height: '100%', background: 'var(--brand)', borderRadius: 3 }} />
          </div>
        </div>

        <SectionHeader title="Questions to ask" action="AI suggest" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {p.questions.map((r, i) => (
            <ChecklistRow
              key={r.id}
              text={r.text}
              done={r.done}
              last={i === p.questions.length - 1}
            />
          ))}
        </div>

        <SectionHeader title="Bring with you" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {p.bring.map((r, i) => (
            <ChecklistRow
              key={r.id}
              text={r.text}
              done={r.done}
              last={i === p.bring.length - 1}
            />
          ))}
        </div>

        <FullButton type="button">Export prep summary</FullButton>
      </div>
    </PhoneShell>
  );
}
