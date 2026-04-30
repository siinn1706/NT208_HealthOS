'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/navigation';
import {
  RefreshCw, MoreHorizontal, Pill, Clock, Stethoscope, Calendar, AlertTriangle,
} from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { Ring } from '@/components/mobile/primitives/ring';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { MedDoseRow } from '@/components/mobile/screens/parts/med-dose-row';
import { DetailRow } from '@/components/mobile/screens/parts/detail-row';
import { getMedicationDetail } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface MedicationDetailScreenProps {
  theme?: string;
}

export function MedicationDetailScreen({ theme: themeProp }: MedicationDetailScreenProps) {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : 'med1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const d = getMedicationDetail(id);

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title=""
        onBack={() => { router.push(`/mobile/meds?${q}`); }}
        right={<>
          <button type="button" className="icon-btn" aria-label="Refresh"><RefreshCw size={16} /></button>
          <button type="button" className="icon-btn" aria-label="More options"><MoreHorizontal size={18} /></button>
        </>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '4px 0 18px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #E88B6E, #D97757)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Pill size={30} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.1 }}>{d.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>{d.strengthLine}</div>
            <span className="chip success" style={{ marginTop: 8 }}>● {d.statusTag}</span>
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                Adherence · 30d
              </div>
              <div className="tabular" style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{Math.round(d.adherence30d * 100)}%</div>
            </div>
            <Ring value={d.adherence30d} size={58} stroke={6} color="var(--success, #059669)">
              <span style={{ fontSize: 11 }}>{d.adherenceRingLabel}</span>
            </Ring>
          </div>
          <div style={{ display: 'flex', gap: 3, height: 30, alignItems: 'flex-end' }}>
            {d.adherenceSeries.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: v ? '100%' : '35%',
                  background: v ? 'var(--success, #059669)' : 'var(--border-strong)',
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
        </div>

        <SectionHeader title="Today's doses" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {d.todayDoses.map((row, i) => (
            <MedDoseRow
              key={row.time + row.state}
              time={row.time}
              state={row.state}
              label={row.label}
              primaryLine={row.primaryLine}
              last={i === d.todayDoses.length - 1}
            />
          ))}
        </div>

        <SectionHeader title="Details" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <DetailRow Icon={Pill} label="Dose" val={d.details.dose} />
          <DetailRow Icon={Clock} label="Schedule" val={d.details.schedule} />
          <DetailRow Icon={Stethoscope} label="Prescriber" val={d.details.prescriber} />
          <DetailRow Icon={Calendar} label="Started" val={d.details.started} />
          <DetailRow Icon={RefreshCw} label="Refills left" val={d.details.refills} last />
        </div>

        <div
          className="card"
          style={{
            background: 'color-mix(in srgb, var(--warning, #D97706) 12%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--warning, #D97706) 30%, transparent)',
            display: 'flex',
            gap: 10,
            padding: 12,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div style={{ color: 'var(--warning, #D97706)' }}><AlertTriangle size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{d.lowSupply.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{d.lowSupply.sub}</div>
          </div>
          <Link href={`/mobile/meds/${id}/refills?${q}`} className="btn" style={{ height: 32, padding: '0 12px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Refill
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link href={`/mobile/meds/${id}/pause?${q}`} style={{ textDecoration: 'none' }}>
            <FullButton type="button" variant="ghost">Pause</FullButton>
          </Link>
          <Link href={`/mobile/meds/${id}/take?${q}`} style={{ textDecoration: 'none' }}>
            <FullButton type="button">Mark taken</FullButton>
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
