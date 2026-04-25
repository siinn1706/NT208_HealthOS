'use client';

import { useSearchParams } from 'next/navigation';
import {
  Search, Bell, Footprints, Droplets, Flame, Moon,
  Pill, Video, Camera, HeartPulse, Bot, Shield, Sparkles,
} from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { TabBar } from '@/components/mobile/shell/tab-bar';
import { Ring } from '@/components/mobile/primitives/ring';
import { Sparkline } from '@/components/mobile/primitives/sparkline';
import { Avatar } from '@/components/mobile/primitives/avatar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { NextUpRow } from './parts/next-up-row';
import { parseTheme, themeClass } from '@/lib/mobile/theme';
import { HOME_USER, HOME_KPI, HOME_NEXT_UP, HOME_AI_INSIGHT, HOME_VITALS_SPARKLINE, HOME_QUICK_ACTIONS } from '@/lib/mobile/mock/home';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  footprints: Footprints, droplets: Droplets, flame: Flame, moon: Moon,
  pill: Pill, video: Video, camera: Camera, heartPulse: HeartPulse,
  bot: Bot, shield: Shield,
};

interface HomeScreenProps { theme?: string; }

export function HomeScreen({ theme }: HomeScreenProps) {
  const params = useSearchParams();
  const resolvedTheme = theme ?? themeClass(parseTheme(params.get('t')));
  const greeting = HOME_USER.greetHour < 12 ? 'Good morning' : HOME_USER.greetHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <PhoneShell theme={resolvedTheme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={<Avatar name="M" size={40} />}
        title={greeting}
        subtitle={`${HOME_USER.name} · Tue, Apr 24`}
        right={<>
          <button className="icon-btn"><Search size={18} /></button>
          <button className="icon-btn"><Bell size={18} /><span className="dot" /></button>
        </>}
      />
      <div className="screen-body" style={{ padding: '4px 20px 20px' }}>
        {/* Hero score card */}
        <div className="card" style={{
          padding: 18, marginBottom: 16, border: 'none', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(140deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 72%, var(--accent)) 100%)',
          color: '#fff',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', right: 20, top: 50, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>Today&apos;s health</div>
              <div className="tabular" style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, marginTop: 4 }}>
                {HOME_USER.score}<span style={{ fontSize: 18, opacity: 0.7 }}>/100</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{HOME_USER.scoreMessage}</div>
            </div>
            <Ring value={HOME_USER.scoreFraction} size={74} stroke={7} color="#fff" track="rgba(255,255,255,0.2)">
              <span style={{ color: '#fff', fontSize: 16 }}>{HOME_USER.score}</span>
            </Ring>
          </div>
        </div>

        {/* KPI rings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {HOME_KPI.map((k) => {
            const Ic = ICON_MAP[k.icon];
            return (
              <div key={k.label} className="card-tight card" style={{ textAlign: 'center', padding: '10px 6px' }}>
                <Ring value={k.v} size={44} stroke={4} color={k.col}>
                  {Ic && <Ic size={14} />}
                </Ring>
                <div className="tabular" style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{k.val}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{k.label}</div>
              </div>
            );
          })}
        </div>

        {/* Next up */}
        <SectionHeader title="Next up" action="See all" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {HOME_NEXT_UP.map((item, i) => {
            const Ic = ICON_MAP[item.icon] ?? Pill;
            return (
              <div key={item.time}>
                {i > 0 && <div style={{ height: 1, background: 'var(--border)', marginLeft: 56 }} />}
                <NextUpRow time={item.time} title={item.title} meta={item.meta} Icon={Ic} badge={item.badge} badgeVariant={item.badgeVariant} />
              </div>
            );
          })}
        </div>

        {/* AI insight */}
        <div className="card" style={{ marginBottom: 16, background: 'color-mix(in srgb, var(--brand-soft) 60%, var(--card))', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: 0.4, textTransform: 'uppercase' }}>AI insight</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, lineHeight: 1.35 }}>{HOME_AI_INSIGHT.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.4 }}>{HOME_AI_INSIGHT.body}</div>
            </div>
          </div>
        </div>

        {/* Vitals sparkline */}
        <SectionHeader title="Vitals" action="Report" />
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>Heart rate · 7 days</div>
              <div className="tabular" style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>
                68 <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>bpm avg</span>
              </div>
            </div>
            <span className="chip success">▼ 4 bpm</span>
          </div>
          <Sparkline data={HOME_VITALS_SPARKLINE} color="var(--brand)" />
        </div>

        {/* Quick actions */}
        <SectionHeader title="Quick actions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {HOME_QUICK_ACTIONS.map((a) => {
            const Ic = ICON_MAP[a.icon];
            return (
              <button key={a.label} className="card-tight card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 4px', cursor: 'pointer', background: 'var(--card)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {Ic && <Ic size={18} />}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <TabBar active="home" />
    </PhoneShell>
  );
}
