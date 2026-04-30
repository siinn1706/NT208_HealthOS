'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Footprints, Moon, Droplets, ChevronRight, Pill, MoreHorizontal, Target } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { Ring } from '@/components/mobile/primitives/ring';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { ChangeRow } from '@/components/mobile/screens/parts/change-row';
import { TODAY_ACTIVITY } from '@/lib/mobile/mock/home-detail';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface TodayOverviewScreenProps { theme?: string; }

const GOALS = [
  { label: '10,000 steps', pct: TODAY_ACTIVITY.steps.pct, val: TODAY_ACTIVITY.steps.val, done: TODAY_ACTIVITY.steps.done, Icon: Footprints },
  { label: '2.5L water', pct: TODAY_ACTIVITY.water.pct, val: TODAY_ACTIVITY.water.val, done: TODAY_ACTIVITY.water.done, Icon: Droplets },
  { label: '8h sleep', pct: TODAY_ACTIVITY.sleep.pct, val: TODAY_ACTIVITY.sleep.val, done: TODAY_ACTIVITY.sleep.done, Icon: Moon },
  { label: 'Take all meds', pct: TODAY_ACTIVITY.meds.pct, val: TODAY_ACTIVITY.meds.val, done: TODAY_ACTIVITY.meds.done, Icon: Pill },
] as const;

export function TodayOverviewScreen({ theme: themeProp }: TodayOverviewScreenProps) {
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Today · Apr 24"
        onBack={() => router.push(`/mobile?t=${t}`)}
        right={<button type="button" className="icon-btn" aria-label="More"><MoreHorizontal size={18} /></button>}
      />
      <div className="screen-body" style={{ padding: '4px 20px 20px' }}>

        <div className="card" style={{
          background: 'linear-gradient(140deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 70%, var(--accent)) 100%)',
          color: '#fff', border: 'none', padding: 18, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring value={0.82} size={80} stroke={8} color="#fff" track="rgba(255,255,255,0.2)">
              <span style={{ color: '#fff', fontSize: 18 }}>82</span>
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Health score</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Looking good</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Up 3 pts from last week</div>
            </div>
          </div>
          <button
            type="button"
            style={{
              marginTop: 14, width: '100%', height: 40, borderRadius: 10,
              background: 'rgba(255,255,255,0.18)', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            How is this calculated?
          </button>
        </div>

        <SectionHeader title="Goals today" action="4 of 6 hit" />
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          {GOALS.map((g, i) => (
            <div key={g.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i === GOALS.length - 1 ? 'none' : '1px solid var(--border)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: g.done ? 'color-mix(in srgb, var(--success, #059669) 18%, transparent)' : 'var(--brand-soft)',
                color: g.done ? 'var(--success, #059669)' : 'var(--brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><g.Icon size={15} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                  <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: g.done ? 'var(--success, #059669)' : 'var(--ink-2)' }}>{g.val}</span>
                </div>
                <div style={{ height: 4, background: 'var(--chip)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${g.pct * 100}%`, height: '100%', background: g.done ? 'var(--success, #059669)' : 'var(--brand)', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <SectionHeader title="What changed?" />
        <div className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
          <ChangeRow dir="up" label="Resting heart rate" val="68 bpm" change="-4 bpm vs last wk" good />
          <div style={{ height: 1, background: 'var(--border)', marginLeft: 48 }} />
          <ChangeRow dir="up" label="Sleep duration" val="7h 12m avg" change="+22 min vs last wk" good />
          <div style={{ height: 1, background: 'var(--border)', marginLeft: 48 }} />
          <ChangeRow dir="down" label="Daily water intake" val="1.8L avg" change="-0.4L vs last wk" />
        </div>

        <div className="card" style={{ background: 'var(--brand-soft)', border: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--brand)' }}><Target size={22} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>Recommended next</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>Drink 500ml of water now to catch up</div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--brand)' }} />
        </div>

      </div>
    </PhoneShell>
  );
}
