'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { Camera, Search, Bell, Clock, ChevronRight } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { MedToggle } from '@/components/mobile/screens/parts/toggle';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { MED_DETAIL_DEMO } from '@/lib/mobile/mock/meds-detail';

interface AddMedicationScreenProps {
  theme?: string;
}

const FREQ_LABELS = ['1×', '2×', '3×', 'PRN'];
const WITH_LABELS = ['Food', 'Water', 'Before meal', 'After meal'];

export function AddMedicationScreen({ theme: themeProp }: AddMedicationScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const a = MED_DETAIL_DEMO.addDefaults;

  const [freqIdx, setFreqIdx] = useState(a.freqIndex ?? 0);
  const [withSet, setWithSet] = useState(() => new Set(['Food']));
  const [remind, setRemind] = useState(true);

  function toggleWith(label: string) {
    setWithSet((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Add medication"
        onBack={() => { router.push(`/mobile/meds?${q}`); }}
        right={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>Save</span>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            className="card"
            style={{
              padding: '14px 10px',
              textAlign: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: 'var(--brand-soft)',
              borderColor: 'var(--brand)',
            }}
          >
            <Camera size={20} style={{ color: 'var(--brand)' }} />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Scan barcode</div>
          </button>
          <button type="button" className="card" style={{ padding: '14px 10px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Search size={20} style={{ color: 'var(--brand)' }} />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Search database</div>
          </button>
        </div>

        <FormField label="Medication name">
          <TextInput value={a.name} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Strength">
            <TextInput value={a.strength} />
          </FormField>
          <FormField label="Form">
            <TextInput value={a.form} trailing={<ChevronRight size={14} />} />
          </FormField>
        </div>

        <FormField label="How often">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {FREQ_LABELS.map((label, i) => {
              const active = i === freqIdx;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFreqIdx(i)}
                  aria-pressed={active}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    background: active ? 'var(--brand-soft)' : 'var(--card)',
                    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border-strong)'}`,
                    color: active ? 'var(--brand)' : 'var(--ink-2)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Time">
          <TextInput value={a.time} leading={<Clock size={16} />} />
        </FormField>

        <FormField label="Take with">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WITH_LABELS.map((label) => {
              const active = withSet.has(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleWith(label)}
                  aria-pressed={active}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 100,
                    background: active ? 'var(--brand-soft)' : 'var(--card)',
                    border: `1px solid ${active ? 'var(--brand)' : 'var(--border-strong)'}`,
                    color: active ? 'var(--brand)' : 'var(--ink-2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Prescribed by (optional)">
          <TextInput placeholder="Doctor name" />
        </FormField>

        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            marginBottom: 16,
            background: 'var(--chip)',
            border: 'none',
          }}
        >
          <Bell size={18} style={{ color: 'var(--brand)' }} aria-hidden="true" />
          <div id="add-med-remind-label" style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Remind me to take</div>
          <MedToggle on={remind} onChange={setRemind} ariaLabelledBy="add-med-remind-label" />
        </div>
      </div>
    </PhoneShell>
  );
}
