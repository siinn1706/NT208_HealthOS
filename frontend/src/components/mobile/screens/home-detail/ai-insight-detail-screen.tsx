'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { Sparkline } from '@/components/mobile/primitives/sparkline';
import { AI_INSIGHT } from '@/lib/mobile/mock/home-detail';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface AiInsightDetailScreenProps { theme?: string; }

export function AiInsightDetailScreen({ theme: themeProp }: AiInsightDetailScreenProps) {
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar title="Insight" onBack={() => router.push(`/mobile?t=${t}`)} />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div className="card" style={{
          padding: 18,
          background: 'linear-gradient(140deg, var(--brand-soft) 0%, color-mix(in srgb, var(--accent) 22%, var(--card)) 100%)',
          borderColor: 'var(--border-strong)',
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--brand)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Sparkles size={18} /></div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.4 }}>AI insight</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{AI_INSIGHT.generatedAt}</div>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, marginTop: 14, lineHeight: 1.25 }}>
            {AI_INSIGHT.heading}
          </div>
        </div>

        <SectionHeader title="Why this matters" />
        <div className="card" style={{ marginBottom: 14, lineHeight: 1.55, fontSize: 13, color: 'var(--ink-2)' }}>
          {AI_INSIGHT.paragraphs[0]}
          <ul style={{ margin: '10px 0 0 0', paddingLeft: 18, color: 'var(--ink-2)' }}>
            {AI_INSIGHT.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>

        <SectionHeader title="Supporting data" />
        <div className="card" style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Resting HR · 30 days</div>
            <span className="chip success">▼ trending</span>
          </div>
          <Sparkline data={AI_INSIGHT.sparkData} color="var(--brand)" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FullButton type="button" variant="ghost">{AI_INSIGHT.actionGhost}</FullButton>
          </div>
          <div style={{ flex: 1 }}>
            <FullButton type="button">{AI_INSIGHT.actionPrimary}</FullButton>
          </div>
        </div>

        <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: 'var(--chip)', fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.5, textAlign: 'center' }}>
          AI insights are educational and not medical advice.
        </div>
      </div>
    </PhoneShell>
  );
}
