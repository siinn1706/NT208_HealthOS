'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { Check, X, Clock, AlertTriangle } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { MedActionCard } from '@/components/mobile/screens/parts/action-card';
import { getMedicationDetail } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface MissedDoseScreenProps {
  theme?: string;
}

export function MissedDoseScreen({ theme: themeProp }: MissedDoseScreenProps) {
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
      <BackBar title="Missed dose" onBack={() => { router.push(`/mobile/meds/${id}?${q}`); }} />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div
          className="card"
          style={{
            background: 'color-mix(in srgb, var(--danger, #E54D4D) 10%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--danger, #E54D4D) 30%, transparent)',
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'var(--danger, #E54D4D)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>{d.missedSummary.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{d.missedSummary.sub}</div>
            </div>
          </div>
        </div>

        <SectionHeader title="What do you want to do?" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <MedActionCard
            Ic={Check}
            color="var(--success, #059669)"
            title="I took it late"
            sub="Log actual time you took the dose"
          />
          <MedActionCard
            Ic={X}
            color="var(--danger, #E54D4D)"
            title="I skipped this dose"
            sub="Mark as skipped · counts toward adherence"
          />
          <MedActionCard
            Ic={Clock}
            color="var(--brand)"
            title="Take it now"
            sub="Log it and shift today's schedule"
          />
        </div>

        <div className="card" style={{ padding: 14, background: 'var(--chip)', border: 'none' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Guidance</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            Don&apos;t double up. If it&apos;s been more than 12 hours, skip and take the next scheduled dose. Contact
            your doctor if unsure.
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
