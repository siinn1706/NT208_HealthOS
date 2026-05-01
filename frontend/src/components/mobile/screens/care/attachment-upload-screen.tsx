'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Paperclip, Activity, X, Plus, AlertCircle } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { AttachRow } from '@/components/mobile/screens/parts/attach-row';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { CARE_ATTACHMENTS, type CareAttachmentRow } from '@/lib/mobile/mock/care';

function iconForRow(row: CareAttachmentRow) {
  if (row.name.includes('ECG') || row.state === 'uploading') return Camera;
  if (row.name.includes('insurance') || row.state === 'error') return Camera;
  if (row.name.includes('pdf')) return Paperclip;
  return Activity;
}

interface AttachmentUploadScreenProps { theme?: string; }

export function AttachmentUploadScreen({ theme: themeProp }: AttachmentUploadScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Attachments"
        onBack={() => { router.push(`/mobile?${q}`); }}
        right={(
          <button type="button" className="icon-btn" style={{ background: 'var(--brand)', color: '#fff', border: 'none' }} aria-label="Add">
            <Plus size={16} />
          </button>
        )}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {CARE_ATTACHMENTS.rows.map((row, index) => {
            const isLast = index === CARE_ATTACHMENTS.rows.length - 1;
            if (row.state === 'uploading') {
              return (
                <div key={row.id} style={{ padding: 14, borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'var(--brand-soft)',
                        color: 'var(--brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={15} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 1 }}>{row.sub}</div>
                    </div>
                    <X size={16} style={{ color: 'var(--ink-3)' }} />
                  </div>
                  <div style={{ height: 4, background: 'var(--chip)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(row.progress ?? 0) * 100}%`,
                        height: '100%',
                        background: 'var(--brand)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              );
            }
            if (row.state === 'error') {
              return (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                    background: 'color-mix(in srgb, var(--danger, #E54D4D) 6%, transparent)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)',
                      color: 'var(--danger, #E54D4D)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AlertCircle size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{row.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--danger, #E54D4D)', marginTop: 1 }}>{row.sub}</div>
                  </div>
                </div>
              );
            }
            const Ic = iconForRow(row);
            return <AttachRow key={row.id} name={row.name} size={row.sub} Icon={Ic} last={isLast} />;
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            className="card"
            style={{
              padding: 18,
              textAlign: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              borderStyle: 'dashed',
            }}
          >
            <Camera size={22} style={{ color: 'var(--brand)' }} />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>Scan document</div>
          </button>
          <button
            type="button"
            className="card"
            style={{
              padding: 18,
              textAlign: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              borderStyle: 'dashed',
            }}
          >
            <Paperclip size={22} style={{ color: 'var(--brand)' }} />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>Choose file</div>
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
