'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { MedSourceRow } from '@/components/mobile/screens/parts/source-row';
import { MedImportRow } from '@/components/mobile/screens/parts/import-row';
import { MED_DETAIL_DEMO } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface ImportMedicationScreenProps {
  theme?: string;
}

export function ImportMedicationScreen({ theme: themeProp }: ImportMedicationScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const data = MED_DETAIL_DEMO;
  const selected = data.importPending.filter((p) => p.selected).length;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar title="Import medications" onBack={() => { router.push(`/mobile/meds?${q}`); }} />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14, lineHeight: 1.5 }}>{data.importCopy}</div>
        <SectionHeader title="Sources" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {data.importSources.map((s, i) => (
            <MedSourceRow
              key={s.name}
              name={s.name}
              sub={s.sub}
              connected={s.connected}
              last={i === data.importSources.length - 1}
            />
          ))}
        </div>

        <SectionHeader title="Pending review · 3" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.importPending.map((p) => (
            <MedImportRow key={p.name} name={p.name} sub={p.sub} selected={p.selected} />
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <FullButton type="button" onClick={() => { router.push(`/mobile/meds?${q}`); }}>
            Import {selected} medications
          </FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
