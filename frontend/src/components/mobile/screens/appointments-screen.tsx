'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Filter, Plus, Clock, Video, MoreHorizontal, Sparkles, MapPin, Stethoscope, ChevronRight,
} from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { TabBar } from '@/components/mobile/shell/tab-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { AptRow } from './parts/apt-row';
import { parseTheme, themeClass } from '@/lib/mobile/theme';
import {
  APT_DAYS,
  APT_DATES,
  APT_TODAY_IDX,
  APT_EVENT_IDXS,
  APT_TOP_SUBTITLE,
  APT_HERO,
  APT_THIS_WEEK,
  APT_PREP,
} from '@/lib/mobile/mock/appointments';

const APT_ICON = { mapPin: MapPin, stethoscope: Stethoscope } as const;

interface AppointmentsScreenProps {
  theme?: string;
}

export function AppointmentsScreen({ theme }: AppointmentsScreenProps) {
  const params = useSearchParams();
  const resolvedTheme = theme ?? themeClass(parseTheme(params.get('t')));
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  return (
    <PhoneShell theme={resolvedTheme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        title="Appointments"
        subtitle={APT_TOP_SUBTITLE}
        right={<>
          <button type="button" className="icon-btn" aria-label="Filter"><Filter size={18} /></button>
          <button
            type="button"
            className="icon-btn"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}
            aria-label="Add appointment"
          >
            <Plus size={18} />
          </button>
        </>}
      />

      <div className="screen-body" style={{ padding: '0 0 20px' }}>
        <div style={{ padding: '4px 20px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {APT_DAYS.map((d, i) => {
              const hasEvent = APT_EVENT_IDXS.includes(i);
              const isToday = i === APT_TODAY_IDX;
              return (
                <div
                  key={i}
                  style={{
                    textAlign: 'center', padding: '10px 0', borderRadius: 12,
                    background: isToday ? 'var(--brand)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--ink)',
                    border: isToday ? 'none' : '1px solid var(--border)',
                    position: 'relative', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 600, opacity: isToday ? 0.9 : 0.7, letterSpacing: 0.3 }}>{d}</div>
                  <div className="tabular" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{APT_DATES[i]}</div>
                  {hasEvent && (
                    <span style={{
                      position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: isToday ? '#fff' : 'var(--brand)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4,
            padding: 4, background: 'var(--chip)', borderRadius: 12,
          }}>
            {(['upcoming', 'past', 'all'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: '8px', borderRadius: 9,
                  background: tab === t ? 'var(--card)' : 'transparent',
                  color: tab === t ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: 600, fontSize: 12, letterSpacing: 0.1,
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  boxShadow: tab === t ? '0 1px 3px rgba(15,39,67,0.08)' : 'none',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '4px 20px 0' }}>
          <div className="card" style={{
            background: 'linear-gradient(140deg, var(--primary-deep) 0%, var(--brand) 100%)',
            border: 'none', color: '#fff', padding: 18, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -20, bottom: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div className="chip" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', marginBottom: 10 }}>
              <Clock size={11} /> {APT_HERO.countdown}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{APT_HERO.name}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{APT_HERO.specialty}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 12, opacity: 0.95 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> {APT_HERO.time}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Video size={13} /> {APT_HERO.mode}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" style={{ flex: 1, background: '#fff', color: 'var(--primary-deep)', height: 40 }}>
                <Video size={16} /> Join
              </button>
              <button
                type="button"
                className="btn ghost"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', height: 40, width: 40, padding: 0 }}
                aria-label="More options"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <SectionHeader title="This week" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {APT_THIS_WEEK.map((row) => {
              const Ic = APT_ICON[row.icon];
              return (
                <AptRow
                  key={row.title}
                  dow={row.dow}
                  dd={row.dd}
                  title={row.title}
                  sub={row.sub}
                  time={row.time}
                  type={row.type}
                  Icon={Ic}
                />
              );
            })}
          </div>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, borderStyle: 'dashed', background: 'transparent' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--brand-soft)', color: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{APT_PREP.title}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{APT_PREP.sub}</div>
            </div>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      <TabBar active="care" />
    </PhoneShell>
  );
}
