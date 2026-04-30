'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { FormExample } from '@/components/mobile/screens/parts/form-example';
import { WheelCol } from '@/components/mobile/screens/parts/wheel-col';
import { ToggleRow } from '@/components/mobile/screens/parts/toggle-row';
import { RadioRow } from '@/components/mobile/screens/parts/radio-row';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface FormPickersScreenProps {
  theme?: string;
}

export function FormPickersScreen({ theme: themeProp }: FormPickersScreenProps) {
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const [day, setDay] = useState(24);
  const [wheelHour, setWheelHour] = useState(2);
  const [wheelMin, setWheelMin] = useState(3);

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Pickers & controls"
        onBack={() => { router.push(`/mobile?t=${t}`); }}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <FormExample title="Date picker">
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button type="button" className="icon-btn ghost" aria-label="Previous month">
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <div style={{ fontSize: 14, fontWeight: 700 }}>April 2026</div>
              <button type="button" className="icon-btn ghost" aria-label="Next month">
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
            <div
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--ink-3)',
                textAlign: 'center', marginBottom: 6,
              }}
            >
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="tabular" aria-hidden="true">{d}</span>
              ))}
            </div>
            <div
              className="tabular"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}
              aria-label="April 2026"
            >
              {Array.from({ length: 30 }).map((_, i) => {
                const d = i + 1;
                const on = d === day;
                const today = d === 24;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setDay(d); }}
                    aria-pressed={on}
                    aria-label={`April ${d}, ${on ? 'selected' : 'not selected'}`}
                    className="tabular"
                    style={{
                      aspectRatio: '1', borderRadius: 8,
                      background: on ? 'var(--brand)' : today ? 'var(--brand-soft)' : 'transparent',
                      color: on ? '#fff' : today ? 'var(--brand)' : 'var(--ink)',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12, fontWeight: on ? 700 : 500,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </FormExample>

        <FormExample title="Time picker (wheel)">
          <div className="card" style={{ padding: '14px 0', position: 'relative' }}>
            <div
              style={{
                position: 'absolute', top: '50%', left: 0, right: 0,
                height: 40, transform: 'translateY(-50%)',
                background: 'var(--brand-soft)', borderRadius: 8, margin: '0 14px', pointerEvents: 'none',
              }}
            />
            <div
              className="tabular"
              style={{
                display: 'grid', gridTemplateColumns: '1fr 20px 1fr', alignItems: 'center', position: 'relative', zIndex: 1,
              }}
            >
              <WheelCol values={['05', '06', '07', '08', '09']} selected={wheelHour} onSelect={setWheelHour} />
              <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700 }} aria-hidden="true">:</div>
              <WheelCol values={['15', '20', '25', '30', '35']} selected={wheelMin} onSelect={setWheelMin} />
            </div>
          </div>
        </FormExample>

        <FormExample title="Toggle">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <ToggleRow label="Medication reminders" sub="Alerts at scheduled times" on />
            <ToggleRow label="Weekly health digest" sub="Mondays at 8 am" on />
            <ToggleRow label="Marketing emails" sub="News and tips" last />
          </div>
        </FormExample>

        <FormExample title="Radio options">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }} role="radiogroup" aria-label="Dosing frequency">
            <RadioRow label="Once daily" sub="e.g. morning or evening" on />
            <RadioRow label="Twice daily" sub="Morning and evening" />
            <RadioRow label="Three times daily" sub="Morning, noon, evening" />
            <RadioRow label="As needed (PRN)" sub="Only when symptoms occur" last />
          </div>
        </FormExample>
      </div>
    </PhoneShell>
  );
}
