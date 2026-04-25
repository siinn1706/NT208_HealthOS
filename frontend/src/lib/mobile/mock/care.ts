/** Mock data for Care / Appointments screens. */

export type ApptStatus = 'in-progress' | 'upcoming' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  status: ApptStatus;
  name: string;
  meta: string;
  time: string;
}

export const APPOINTMENTS: Appointment[] = [
  { id: 'apt1', status: 'in-progress', name: 'Dr. Nguyen Lan',      meta: 'Cardiology · Video',          time: 'Today · 11:30' },
  { id: 'apt2', status: 'upcoming',    name: 'Dr. Tran Van Minh',   meta: 'General practice · In-person', time: 'Fri · 09:00'   },
  { id: 'apt3', status: 'upcoming',    name: 'Lab tests',            meta: 'Sunrise Clinic · Fasting',     time: 'Mon · 07:30'   },
  { id: 'apt4', status: 'completed',   name: 'Dr. Nguyen Lan',       meta: 'Cardiology · Follow-up',       time: 'Apr 10 · 11:00' },
  { id: 'apt5', status: 'cancelled',   name: 'Dermatology consult',  meta: 'Rescheduled',                  time: 'Apr 5'         },
];

export interface PrescriptionItem {
  label: string;
  value: string;
  icon: 'pill' | 'clock' | 'calendar' | 'alert';
}

export const PRESCRIPTION_ITEMS: PrescriptionItem[] = [
  { label: 'Dose',      value: '10 mg · 1 tablet',      icon: 'pill'     },
  { label: 'Frequency', value: 'Once daily · morning',   icon: 'clock'    },
  { label: 'Duration',  value: '90 days',                icon: 'calendar' },
  { label: 'Refills',   value: '2 remaining',            icon: 'alert'    },
];

export interface Attachment {
  id: string;
  name: string;
  size: string;
  icon: 'paperclip' | 'activity' | 'camera' | 'filetext';
  state: 'done' | 'uploading' | 'error';
  /** Upload progress 0-100 (only relevant when state === 'uploading') */
  progress?: number;
}

export const ATTACHMENTS: Attachment[] = [
  { id: 'att1', name: 'ECG_scan_Apr24.png',     size: '2.3 MB',  icon: 'camera',    state: 'uploading', progress: 64 },
  { id: 'att2', name: 'Lab_results_Apr10.pdf',  size: '482 KB',  icon: 'paperclip', state: 'done'                   },
  { id: 'att3', name: 'BP_log_2weeks.csv',       size: '12 KB',   icon: 'activity',  state: 'done'                   },
];

export type TimelineTag = 'Visit' | 'Lab' | 'Rx' | 'Dx';

export interface TimelineEntry {
  id: string;
  year?: string;
  date: string;
  title: string;
  sub: string;
  tag: TimelineTag;
  color: string;
}

export const TIMELINE_ENTRIES: TimelineEntry[] = [
  { id: 'tl1', year: '2026', date: 'Apr 10', title: 'Follow-up — Cardiology',  sub: 'Dr. Nguyen Lan',            tag: 'Visit', color: 'var(--brand)'           },
  { id: 'tl2',              date: 'Mar 18', title: 'Blood panel',              sub: 'Sunrise Clinic · Fasting',  tag: 'Lab',   color: 'var(--accent)'          },
  { id: 'tl3',              date: 'Mar 3',  title: 'Lisinopril prescribed',    sub: '10 mg · 1×/day',            tag: 'Rx',    color: '#E3B79A'                 },
  { id: 'tl4', year: '2025', date: 'Dec 12', title: 'Hypertension diagnosed',  sub: 'Stage 1 · monitoring',      tag: 'Dx',    color: 'var(--warning, #D97706)' },
  { id: 'tl5',              date: 'Oct 2',  title: 'Annual physical',          sub: 'Dr. Tran Van Minh',         tag: 'Visit', color: 'var(--brand)'           },
];
