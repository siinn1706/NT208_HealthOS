'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Plus } from 'lucide-react';
import Link from 'next/link';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { TabBar } from '@/components/mobile/shell/tab-bar';
import { ApptCard } from '@/components/mobile/screens/parts/appt-card';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { CARE_APPOINTMENTS_LIST, type ApptFilterTab } from '@/lib/mobile/mock/care';

const FILTER_TABS: { k: ApptFilterTab; label: string }[] = [
  { k: 'up', label: 'Up' },
  { k: 'in_progress', label: 'In prog' },
  { k: 'past', label: 'Past' },
  { k: 'all', label: 'All' },
];

function matchesFilter(tab: ApptFilterTab, item: (typeof CARE_APPOINTMENTS_LIST)[0]): boolean {
  if (tab === 'all') return true;
  if (tab === 'in_progress') return !!item.inProgress;
  if (tab === 'up') return !item.muted;
  if (tab === 'past') return !!item.muted;
  return true;
}

interface AppointmentsRefinedScreenProps { theme?: string; }

export function AppointmentsRefinedScreen({ theme: themeProp }: AppointmentsRefinedScreenProps) {
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;

  const [filter, setFilter] = useState<ApptFilterTab>('up');

  const list = useMemo(
    () => CARE_APPOINTMENTS_LIST.filter((row) => matchesFilter(filter, row)),
    [filter],
  );

  return (
    <PhoneShell theme={resolvedTheme}>
      <TopBar
        title="Care"
        subtitle="Appointments · Prep · History"
        right={(
          <>
            <button type="button" className="icon-btn" aria-label="Filter">
              <Filter size={18} />
            </button>
            <Link
              href={`/mobile/care/appointments/new?${q}`}
              className="icon-btn"
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="New appointment"
            >
              <Plus size={18} />
            </Link>
          </>
        )}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
            padding: 4,
            background: 'var(--chip)',
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          {FILTER_TABS.map(({ k, label }) => {
            const on = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                style={{
                  padding: '8px 0',
                  borderRadius: 9,
                  border: 'none',
                  background: on ? 'var(--card)' : 'transparent',
                  color: on ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: on ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {list.map((a) => (
          <div
            key={a.id}
            role="link"
            tabIndex={0}
            onClick={() => router.push(`/mobile/care/appointments/${a.id}?${q}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/mobile/care/appointments/${a.id}?${q}`);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <ApptCard
              status={a.status}
              statusColor={a.statusColor}
              name={a.name}
              meta={a.meta}
              time={a.time}
              inProgress={a.inProgress}
              muted={a.muted}
              onJoin={
                a.inProgress
                  ? () => { router.push(`/mobile/care/appointments/${a.id}/join?${q}`); }
                  : undefined
              }
            />
          </div>
        ))}
      </div>
      <TabBar active="care" />
    </PhoneShell>
  );
}
