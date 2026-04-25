'use client';

import { ShieldCheck } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { Ring } from '@/components/mobile/primitives/ring';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { SCORE_CATEGORIES } from '@/lib/mobile/mock/home-detail';

interface Props { theme?: string; }

function barColor(val: number) {
  if (val >= 80) return 'var(--success, #059669)';
  if (val >= 60) return 'var(--brand)';
  return 'var(--warning, #D97706)';
}

function valColor(val: number) {
  if (val >= 80) return 'var(--success, #059669)';
  if (val >= 60) return 'var(--ink)';
  return 'var(--warning, #D97706)';
}

export function HealthScoreDetailScreen({ theme = 'theme-calm' }: Props) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <BackBar title="Health score" />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>

        {/* Large ring */}
        <div style={{ textAlign: 'center', padding: '8px 0 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Ring value={0.82} size={140} stroke={12} color="var(--brand)">
              <div>
                <div className="tabular" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>82</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>/ 100</div>
              </div>
            </Ring>
          </div>
          <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700 }}>Looking good</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, maxWidth: 280, margin: '4px auto 0', lineHeight: 1.5 }}>
            A composite of 6 factors based on your logged activity, vitals, and medication adherence.
          </div>
        </div>

        {/* Category breakdown */}
        <SectionHeader title="How we calculate" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {SCORE_CATEGORIES.map((f, i) => (
            <div key={f.label} style={{
              padding: '12px 14px',
              borderBottom: i === SCORE_CATEGORIES.length - 1 ? 'none' : '1px solid var(--border)',
              borderLeft: `3px solid ${f.color}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>Weight {f.weight}</div>
                </div>
                <span className="tabular" style={{ fontSize: 15, fontWeight: 700, color: valColor(f.val) }}>
                  {f.val}
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--chip)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${f.val}%`, height: '100%', background: barColor(f.val), borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="card" style={{ padding: 12, display: 'flex', gap: 10, background: 'var(--chip)', border: 'none' }}>
          <ShieldCheck size={16} style={{ color: 'var(--ink-3)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Not a clinical score. For guidance only — always consult your care team for medical decisions.
          </div>
        </div>

      </div>
    </PhoneShell>
  );
}
