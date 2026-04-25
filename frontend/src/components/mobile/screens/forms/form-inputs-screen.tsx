'use client';

import { ChevronDown, Search } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { FormField } from '@/components/mobile/primitives/form-field';
import { TextInput } from '@/components/mobile/primitives/text-input';
import { FormExample } from '@/components/mobile/screens/parts/form-example';
import { UploadRow } from '@/components/mobile/screens/parts/upload-row';

interface FormInputsScreenProps {
  theme?: string;
}

/** Demo screen — text inputs, select dropdown, and upload attachment list. */
export function FormInputsScreen({ theme = 'theme-calm' }: FormInputsScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <BackBar title="Inputs" />

      <div className="screen-body" style={{ padding: '0 20px 20px' }}>

        {/* Default text input */}
        <FormExample title="Default">
          <FormField label="Email">
            <TextInput value="minh@example.com" />
          </FormField>
        </FormExample>

        {/* Input with leading icon and trailing shortcut */}
        <FormExample title="With leading + trailing">
          <FormField label="Search">
            <TextInput
              placeholder="Find a medication…"
              leading={<Search size={15} aria-hidden="true" />}
              trailing={
                <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 700 }}>⌘K</span>
              }
            />
          </FormField>
        </FormExample>

        {/* Focused state — inline to show brand ring + cursor */}
        <FormExample title="Focused">
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', marginBottom: 6 }}>
              Full name
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', height: 50, padding: '0 14px',
              background: 'var(--card)', borderRadius: 12,
              border: '1.5px solid var(--brand)',
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent)',
            }}>
              <input
                defaultValue="Minh Nguyen"
                aria-label="Full name"
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  outline: 'none', fontSize: 15, color: 'var(--ink)', fontFamily: 'inherit',
                }}
              />
              {/* Blinking cursor */}
              <span
                aria-hidden="true"
                style={{ width: 2, height: 18, background: 'var(--brand)', animation: 'blink 1s steps(2) infinite' }}
              />
            </div>
          </label>
        </FormExample>

        {/* Error state */}
        <FormExample title="Error state">
          <FormField label="Password" error="Must be at least 8 characters">
            <TextInput type="password" value="1234" error />
          </FormField>
        </FormExample>

        {/* Disabled */}
        <FormExample title="Disabled">
          <FormField label="Member since">
            <div style={{
              display: 'flex', alignItems: 'center', height: 50, padding: '0 14px',
              background: 'var(--chip)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--ink-3)', fontSize: 15,
            }}>
              Mar 3, 2026
            </div>
          </FormField>
        </FormExample>

        {/* Select / dropdown */}
        <FormExample title="Select / dropdown">
          <FormField label="Specialty">
            <div style={{
              display: 'flex', alignItems: 'center', height: 50, padding: '0 14px',
              background: 'var(--card)', border: '1px solid var(--border-strong)',
              borderRadius: 12, justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 15 }}>Cardiology</span>
              <ChevronDown size={15} style={{ color: 'var(--ink-3)' }} aria-hidden="true" />
            </div>
          </FormField>
        </FormExample>

        {/* Upload attachment list */}
        <FormExample title="Upload attachment">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <UploadRow name="Lab_results.pdf" size="482 KB" done />
            <UploadRow name="ECG_scan.png" size="2.3 MB" progress={0.64} />
            <UploadRow name="Prescription.jpg" size="1.1 MB" error last />
          </div>
        </FormExample>

      </div>
    </PhoneShell>
  );
}
