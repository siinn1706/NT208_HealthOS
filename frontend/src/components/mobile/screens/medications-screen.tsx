'use client';

import { useSearchParams } from 'next/navigation';
import { Link } from '@/navigation';
import { Plus, RefreshCw, AlertTriangle, Sun, Moon, Coffee, ChevronRight } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { TabBar } from '@/components/mobile/shell/tab-bar';
import { Ring } from '@/components/mobile/primitives/ring';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { DoseRow } from './parts/dose-row';
import { MedCard } from './parts/med-card';
import { parseTheme, themeClass } from '@/lib/mobile/theme';
import {
  MEDS_TOP_SUBTITLE,
  MEDS_ADHERENCE,
  MEDS_ADHERENCE_RING_LABEL,
  MEDS_REFILL_ALERT,
  MEDS_DISCLAIMER,
  MEDS_DOSES,
  MEDS_ACTIVE,
} from '@/lib/mobile/mock/meds';

const DOSE_ICONS = { sun: Sun, coffee: Coffee, moon: Moon } as const;

function DoseSeparator() {
  return <div style={{ height: 1, background: 'var(--border)', marginLeft: 56 }} />;
}

interface MedicationsScreenProps {
  theme?: string;
}

export function MedicationsScreen({ theme }: MedicationsScreenProps) {
  const params = useSearchParams();
  const t = parseTheme(params.get('t'));
  const q = `t=${t}`;
  const resolvedTheme = theme ?? themeClass(t);

  return (
    <PhoneShell theme={resolvedTheme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        title="Medications"
        subtitle={MEDS_TOP_SUBTITLE}
        right={<>
          <button type="button" className="icon-btn" aria-label="Refresh"><RefreshCw size={18} /></button>
          <Link
            href={`/mobile/meds/new?${q}`}
            className="icon-btn"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', display: 'flex' }}
            aria-label="Add medication"
          >
            <Plus size={18} />
          </Link>
        </>}
      />

      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div className="card" style={{ padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Ring value={MEDS_ADHERENCE.value} size={72} stroke={7} color="var(--success, #059669)">
            <span style={{ fontSize: 14 }}>{MEDS_ADHERENCE_RING_LABEL}</span>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>30-day adherence</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {MEDS_ADHERENCE.days}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>/{MEDS_ADHERENCE.total} days</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>On track — {MEDS_ADHERENCE.missedLabel}</div>
          </div>
        </div>

        <div className="card" style={{
          marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12,
          borderColor: 'color-mix(in srgb, var(--warning, #D97706) 40%, var(--border))',
          background: 'color-mix(in srgb, var(--warning, #D97706) 8%, var(--card))',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'color-mix(in srgb, var(--warning, #D97706) 18%, transparent)',
            color: 'var(--warning, #D97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{MEDS_REFILL_ALERT.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{MEDS_REFILL_ALERT.sub}</div>
          </div>
          <ChevronRight size={16} />
        </div>

        <SectionHeader title="Today's doses" action="View all" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {MEDS_DOSES.map((d, i) => {
            const Ic = DOSE_ICONS[d.icon];
            return (
              <div key={d.time + d.name}>
                {i > 0 && <DoseSeparator />}
                <DoseRow
                  Icon={Ic}
                  time={d.time}
                  name={d.name}
                  dose={d.dose}
                  meal={d.meal}
                  state={d.state}
                  takenAt={d.takenAt}
                />
              </div>
            );
          })}
        </div>

        <SectionHeader title="Active medications" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MEDS_ACTIVE.map((m) => (
            <Link
              key={m.id}
              href={`/mobile/meds/${m.id}?${q}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <MedCard
                color={m.color}
                name={m.name}
                dose={m.dose}
                since={m.since}
                adherence={m.adherence}
                refill={m.refill}
              />
            </Link>
          ))}
        </div>

        <div style={{
          marginTop: 14, padding: 10, borderRadius: 10,
          background: 'var(--chip)',
          fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.4, textAlign: 'center',
        }}>
          {MEDS_DISCLAIMER}
        </div>
      </div>

      <TabBar active="meds" />
    </PhoneShell>
  );
}
