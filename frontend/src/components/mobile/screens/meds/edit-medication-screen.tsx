'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/navigation';
import { ChevronRight } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { getMedicationDetail, MED_DETAIL_DEMO } from '@/lib/mobile/mock/meds-detail';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';

interface EditMedicationScreenProps {
  theme?: string;
}

export function EditMedicationScreen({ theme: themeProp }: EditMedicationScreenProps) {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : 'med1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const d = getMedicationDetail(id);
  const notes = MED_DETAIL_DEMO.editDefaults.notes;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Edit medication"
        onBack={() => { router.push(`/mobile/meds/${id}?${q}`); }}
        right={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>Save</span>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <FormField label="Medication name">
          <TextInput value={d.name} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Strength">
            <TextInput value="10 mg" />
          </FormField>
          <FormField label="Form">
            <TextInput value="Tablet" trailing={<ChevronRight size={14} />} />
          </FormField>
        </div>
        <FormField label="Schedule">
          <TextInput value={d.details.schedule} trailing={<ChevronRight size={14} />} />
        </FormField>
        <FormField label="Duration">
          <TextInput value="Ongoing" trailing={<ChevronRight size={14} />} />
        </FormField>
        <FormField label="Notes">
          <textarea
            defaultValue={notes}
            style={{
              width: '100%',
              minHeight: 70,
              padding: 14,
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              background: 'var(--card)',
              color: 'var(--ink)',
              fontFamily: 'inherit',
              fontSize: 13,
              outline: 'none',
              resize: 'none',
            }}
          />
        </FormField>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          <Link
            href={`/mobile/meds/${id}/pause?${q}`}
            style={{
              height: 50,
              borderRadius: 14,
              background: 'transparent',
              color: 'var(--warning, #D97706)',
              border: '1px solid color-mix(in srgb, var(--warning, #D97706) 40%, transparent)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            Pause medication
          </Link>
          <Link
            href={`/mobile/meds/${id}/archive?${q}`}
            style={{
              height: 50,
              borderRadius: 14,
              background: 'transparent',
              color: 'var(--danger, #E54D4D)',
              border: '1px solid color-mix(in srgb, var(--danger, #E54D4D) 40%, transparent)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            Archive medication
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
