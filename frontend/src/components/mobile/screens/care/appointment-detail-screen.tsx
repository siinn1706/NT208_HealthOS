'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  Paperclip,
  Activity,
  Sparkles,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { DetailRow } from '@/components/mobile/screens/parts/detail-row';
import { AttachRow } from '@/components/mobile/screens/parts/attach-row';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { CARE_APPOINTMENT_DETAIL } from '@/lib/mobile/mock/care';

interface AppointmentDetailScreenProps { theme?: string; }

export function AppointmentDetailScreen({ theme: themeProp }: AppointmentDetailScreenProps) {
  const params = useParams();
  const paramsId = params?.id;
  const id = typeof paramsId === 'string' ? paramsId : 'apt1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const d = CARE_APPOINTMENT_DETAIL;

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar
        title="Appointment"
        onBack={() => { router.push(`/mobile/care/appointments?${q}`); }}
        right={<button type="button" className="icon-btn" aria-label="More"><MoreHorizontal size={18} /></button>}
      />
      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(140deg, var(--primary-deep, var(--ink)) 0%, var(--brand) 100%)',
            border: 'none',
            color: '#fff',
            padding: 18,
            marginBottom: 14,
          }}
        >
          <span className="chip" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', marginBottom: 10 }}>
            <Clock size={11} /> {d.statusChip}
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{d.doctorName}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{d.specialty}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={13} /> {d.dateLine}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> {d.timeLine}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <FullButton
              type="button"
              style={{ background: '#fff', color: 'var(--brand)' }}
              onClick={() => { router.push(`/mobile/care/appointments/${id}/join?${q}`); }}
            >
              <Video size={16} /> Join video call
            </FullButton>
          </div>
        </div>

        <SectionHeader title="Details" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <DetailRow Icon={Video} label="Type" val={d.details[0].value} />
          <DetailRow Icon={MapPin} label="Location" val={d.details[1].value} />
          <DetailRow Icon={User} label="Patient" val={d.details[2].value} last />
        </div>

        <SectionHeader title="Reason for visit" />
        <div className="card" style={{ marginBottom: 14, padding: 14, lineHeight: 1.5, fontSize: 13, color: 'var(--ink-2)' }}>
          {d.reason}
        </div>

        <SectionHeader title="Attachments" action="Add" />
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <AttachRow name={d.attachments[0].name} size={d.attachments[0].size} Icon={Paperclip} />
          <AttachRow name={d.attachments[1].name} size={d.attachments[1].size} Icon={Activity} last />
        </div>

        <Link href={`/mobile/care/appointments/${id}/prep?${q}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            className="card"
            style={{
              background: 'var(--brand-soft)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div style={{ color: 'var(--brand)' }}><Sparkles size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Prep for this visit</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{d.prep.sublabel}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--brand)' }} />
          </div>
        </Link>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <FullButton variant="ghost" type="button">Reschedule</FullButton>
          <FullButton
            variant="ghost"
            type="button"
            style={{
              color: 'var(--danger, #E54D4D)',
              borderColor: 'color-mix(in srgb, var(--danger, #E54D4D) 30%, transparent)',
            }}
          >
            Cancel
          </FullButton>
        </div>
      </div>
    </PhoneShell>
  );
}
