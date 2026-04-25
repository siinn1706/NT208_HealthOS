'use client';

import { Video, MapPin, Clock, Calendar, Paperclip, Activity, ChevronRight, MoreHorizontal, Sparkles } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { DetailRow } from '@/components/mobile/screens/parts/detail-row';

/** Inline attach row — lighter variant without progress bar used in detail view */
function SimpleAttachRow({ name, size, Ic, last }: { name: string; size: string; Ic: React.FC<{ size: number }>; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: 12,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--chip)', color: 'var(--ink-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}><Ic size={15}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{size}</div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--ink-4)' }}/>
    </div>
  );
}

interface AppointmentDetailScreenProps {
  theme?: string;
}

export function AppointmentDetailScreen({ theme = 'theme-calm' }: AppointmentDetailScreenProps) {
  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <BackBar title="Appointment" right={<button className="icon-btn"><MoreHorizontal size={18}/></button>}/>
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>

        {/* Hero card */}
        <div className="card" style={{
          background: 'linear-gradient(140deg, var(--primary-deep, var(--ink)) 0%, var(--brand) 100%)',
          border: 'none', color: '#fff', padding: 18, marginBottom: 14,
        }}>
          <span className="chip" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', marginBottom: 10 }}>
            <Clock size={11}/> In 2h 14m
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Dr. Nguyen Thi Lan</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Cardiology · Follow-up</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={13}/> Tue Apr 24</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13}/> 11:30 · 30 min</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <FullButton style={{ background: '#fff', color: 'var(--brand)' }}>
              <Video size={16}/> Join video call
            </FullButton>
          </div>
        </div>

        <SectionHeader title="Details"/>
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <DetailRow Ic={Video}   label="Type"     val="Video consultation"/>
          <DetailRow Ic={MapPin}  label="Location" val="Remote · Link opens in app"/>
          <DetailRow Ic={Clock}   label="Patient"  val="Minh Nguyen" last/>
        </div>

        <SectionHeader title="Reason for visit"/>
        <div className="card" style={{ marginBottom: 14, padding: 14, lineHeight: 1.5, fontSize: 13, color: 'var(--ink-2)' }}>
          Follow-up on medication adjustment. Recent BP readings have been stable; discussing whether to continue current dose of Lisinopril.
        </div>

        <SectionHeader title="Attachments" action="Add"/>
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <SimpleAttachRow name="Lab_results_Apr10.pdf" size="482 KB" Ic={Paperclip}/>
          <SimpleAttachRow name="BP_log_2weeks.csv"     size="12 KB"  Ic={Activity} last/>
        </div>

        {/* Visit prep promo */}
        <div className="card" style={{
          background: 'var(--brand-soft)', border: 'none',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
          <div style={{ color: 'var(--brand)' }}><Sparkles size={20}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Prep for this visit</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>3 AI-suggested questions</div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--brand)' }}/>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <FullButton variant="ghost">Reschedule</FullButton>
          <FullButton variant="ghost" style={{ color: 'var(--danger, #E54D4D)', borderColor: 'color-mix(in srgb, var(--danger, #E54D4D) 30%, transparent)' }}>
            Cancel
          </FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
