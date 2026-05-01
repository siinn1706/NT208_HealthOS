'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Sparkles, MoreHorizontal } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { StatBlock } from '@/components/mobile/screens/parts/stat-block';
import { VITALS_7DAY, type VitalDay } from '@/lib/mobile/mock/home-detail';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface VitalsDetailScreenProps { theme?: string; }

const RANGES = ['1D', '7D', '1M', '6M', '1Y'] as const;

const READINGS = [
  { t: 'Apr 24 · 07:14', v: 64, tag: 'Resting' },
  { t: 'Apr 24 · 06:02', v: 122, tag: 'Exercise' },
  { t: 'Apr 23 · 22:30', v: 58, tag: 'Sleep' },
];

/** Raw SVG multi-line HR chart ported verbatim from bundle. */
function HrChart() {
  return (
    <div className="card" style={{ marginTop: 14, padding: '14px 10px' }}>
      <svg viewBox="0 0 320 140" width="100%" height={140} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={0} x2={320} y1={20 + i * 25} y2={20 + i * 25}
            stroke="var(--border)" strokeDasharray="2 3" strokeWidth="1" />
        ))}
        <rect x={0} y={50} width={320} height={50}
          fill="color-mix(in srgb, var(--success, #059669) 10%, transparent)" />
        <path
          d="M0,70 L40,78 L80,60 L120,66 L160,82 L200,90 L240,84 L280,88 L320,92 L320,140 L0,140 Z"
          fill="var(--brand)" opacity="0.14" />
        <path
          d="M0,70 L40,78 L80,60 L120,66 L160,82 L200,90 L240,84 L280,88 L320,92"
          stroke="var(--brand)" strokeWidth="2.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        {[{ x: 40, y: 78 }, { x: 80, y: 60 }, { x: 120, y: 66 },
          { x: 160, y: 82 }, { x: 200, y: 90 }, { x: 240, y: 84 }, { x: 280, y: 88 }].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3"
            fill="var(--card)" stroke="var(--brand)" strokeWidth="2" />
        ))}
        <circle cx={200} cy={90} r="5" fill="var(--brand)" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-4)', fontWeight: 600 }}>
        {['Apr 18', '', '20', '', '22', '', '24'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
    </div>
  );
}

type SeriesKey = 'hr' | 'bpSys' | 'bpDia' | 'spo2' | 'weight';

const SERIES: { key: SeriesKey; label: string; stroke: string }[] = [
  { key: 'hr', label: 'HR', stroke: 'var(--brand)' },
  { key: 'bpSys', label: 'BP sys', stroke: 'var(--ink-2)' },
  { key: 'bpDia', label: 'BP dia', stroke: 'color-mix(in srgb, var(--ink-2) 70%, var(--brand))' },
  { key: 'spo2', label: 'SpO₂', stroke: 'var(--success, #059669)' },
  { key: 'weight', label: 'Wt', stroke: 'var(--warning, #D97706)' },
];

function seriesPath(
  days: VitalDay[],
  key: SeriesKey,
  top = 18,
  bottom = 125,
) {
  const vals = days.map((d) => d[key]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const spread = maxV - minV || 1;
  return vals.map((v, i) => {
    const x = (i / (days.length - 1)) * 320;
    const t = (v - minV) / spread;
    const y = top + (1 - t) * (bottom - top);
    return { x, y };
  });
}

/** Multi-metric 7-day trends — raw SVG lines from `VITALS_7DAY` (separate y-scale per series). */
function MultiMetricVitalsChart({ days }: { days: VitalDay[] }) {
  return (
    <div className="card" style={{ marginTop: 14, padding: '14px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>7-day · all metrics (normalized per series)</div>
      <svg viewBox="0 0 320 130" width="100%" height={130} role="img" aria-label="Seven-day vitals trend chart">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={0} x2={320} y1={16 + i * 24} y2={16 + i * 24}
            stroke="var(--border)" strokeDasharray="2 3" strokeWidth="1" />
        ))}
        {SERIES.map((s) => {
          const pts = seriesPath(days, s.key);
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return (
            <path key={s.key} d={d} fill="none" stroke={s.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', marginTop: 8, fontSize: 10, fontWeight: 600, color: 'var(--ink-3)' }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, background: s.stroke, borderRadius: 1 }} />
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-4)', fontWeight: 600 }}>
        {days.map((d) => (
          <span key={d.date} style={{ maxWidth: 36, textAlign: 'center', lineHeight: 1.1 }}>{d.date.replace('Apr ', '')}</span>
        ))}
      </div>
    </div>
  );
}

export function VitalsDetailScreen({ theme: themeProp }: VitalsDetailScreenProps) {
  const [range, setRange] = useState<typeof RANGES[number]>('7D');
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Heart rate"
        onBack={() => router.push(`/mobile?t=${t}`)}
        right={<>
          <button type="button" className="icon-btn" aria-label="Add"><Plus size={16} /></button>
          <button type="button" className="icon-btn" aria-label="More"><MoreHorizontal size={18} /></button>
        </>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>

        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Resting · 7 day average
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span className="tabular" style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.2 }}>68</span>
            <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>bpm</span>
            <span className="chip success" style={{ marginLeft: 'auto' }}>▼ 4 bpm</span>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
          padding: 4, background: 'var(--chip)', borderRadius: 10, marginTop: 16,
        }}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: range === r ? 'var(--card)' : 'transparent',
                color: range === r ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: 700, fontSize: 11, fontFamily: 'inherit',
                boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >{r}</button>
          ))}
        </div>

        <HrChart />
        <SectionHeader title="7-day vitals" />
        <MultiMetricVitalsChart days={VITALS_7DAY} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
          <StatBlock label="Min" val="54" unit="bpm" />
          <StatBlock label="Avg" val="68" unit="bpm" primary />
          <StatBlock label="Max" val="124" unit="bpm" />
        </div>

        <SectionHeader title="Insights" action="See all" />
        <div className="card" style={{ padding: 14, display: 'flex', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'var(--brand-soft)', color: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Your resting HR is 4 bpm lower</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.45 }}>
              Likely tied to improved sleep consistency this week. Keep it up — we&apos;ll show this to Dr. Nguyen on Friday.
            </div>
          </div>
        </div>

        <SectionHeader title="Readings" />
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {READINGS.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              borderBottom: i === READINGS.length - 1 ? 'none' : '1px solid var(--border)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.tag}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{r.t}</div>
              </div>
              <span className="tabular" style={{ fontSize: 16, fontWeight: 700 }}>
                {r.v}{' '}
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>bpm</span>
              </span>
            </div>
          ))}
        </div>

      </div>
    </PhoneShell>
  );
}
