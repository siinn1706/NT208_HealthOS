/**
 * Static mock data for Care / Appointments detail flows.
 * `params.id` on dynamic routes is ignored; UI always uses these defaults.
 */

export type ApptFilterTab = 'up' | 'in_progress' | 'past' | 'all';

export interface CareAppointmentListItem {
  id: string;
  status: string;
  statusColor: string;
  name: string;
  meta: string;
  time: string;
  inProgress?: boolean;
  muted?: boolean;
}

export const CARE_DEMO_APPOINTMENT_ID = 'apt1';
export const CARE_DEMO_PRESCRIPTION_ID = 'rx1';

export const CARE_APPOINTMENTS_LIST: CareAppointmentListItem[] = [
  {
    id: 'apt0',
    status: 'In progress',
    statusColor: 'var(--success, #059669)',
    name: 'Dr. Nguyen Lan',
    meta: 'Cardiology · Video',
    time: 'Today · 11:30',
    inProgress: true,
  },
  {
    id: 'apt1',
    status: 'Upcoming',
    statusColor: 'var(--brand)',
    name: 'Dr. Tran Van Minh',
    meta: 'General practice · In-person',
    time: 'Fri · 09:00',
  },
  {
    id: 'apt2',
    status: 'Upcoming',
    statusColor: 'var(--brand)',
    name: 'Lab tests',
    meta: 'Sunrise Clinic · Fasting',
    time: 'Mon · 07:30',
  },
  {
    id: 'apt3',
    status: 'Completed',
    statusColor: 'var(--ink-3)',
    name: 'Dr. Nguyen Lan',
    meta: 'Cardiology · Follow-up',
    time: 'Apr 10 · 11:00',
    muted: true,
  },
  {
    id: 'apt4',
    status: 'Cancelled',
    statusColor: 'var(--danger, #E54D4D)',
    name: 'Dermatology consult',
    meta: 'Rescheduled',
    time: 'Apr 5',
    muted: true,
  },
];

export const CARE_APPOINTMENT_DETAIL = {
  id: CARE_DEMO_APPOINTMENT_ID,
  statusChip: 'In 2h 14m',
  doctorName: 'Dr. Nguyen Thi Lan',
  specialty: 'Cardiology · Follow-up',
  dateLine: 'Tue Apr 24',
  timeLine: '11:30 · 30 min',
  details: [
    { key: 'type' as const, label: 'Type', value: 'Video consultation' },
    { key: 'loc' as const, label: 'Location', value: 'Remote · Link opens in app' },
    { key: 'patient' as const, label: 'Patient', value: 'Minh Nguyen' },
  ],
  reason:
    'Follow-up on medication adjustment. Recent BP readings have been stable; discussing whether to continue current dose of Lisinopril.',
  attachments: [
    { name: 'Lab_results_Apr10.pdf', size: '482 KB' },
    { name: 'BP_log_2weeks.csv', size: '12 KB' },
  ],
  prep: { sublabel: '3 AI-suggested questions' },
} as const;

export const CARE_VISIT_PREP = {
  eyebrow: "For Friday's visit",
  doctorName: 'Dr. Tran Van Minh',
  meta: 'General practice · 4 of 7 complete',
  progressPct: 57,
  questions: [
    { id: 'q1', text: 'Is my current BP medication still right for me?', done: true },
    { id: 'q2', text: 'Should I be concerned about my slightly elevated cholesterol?', done: true },
    { id: 'q3', text: 'How should I handle the occasional dizziness?', done: false },
    { id: 'q4', text: 'Can I stop taking Atorvastatin in 3 months?', done: false },
  ],
  bring: [
    { id: 'b1', text: 'BP log (last 2 weeks)', done: true },
    { id: 'b2', text: 'Symptom diary', done: false },
    { id: 'b3', text: 'Insurance card', done: false },
  ],
} as const;

export const CARE_JOIN_VIDEO = {
  doctorInitial: 'L',
  selfInitial: 'M',
  doctorName: 'Dr. Nguyen Lan',
  line: 'Cardiology · Connected',
  liveLabel: 'LIVE · 04:12',
} as const;

export const CARE_PRESCRIPTION = {
  id: 'rx1',
  code: 'RX-24091',
  name: 'Lisinopril 10 mg',
  issued: 'Issued Apr 10, 2026 · by Dr. Nguyen Lan',
  rows: [
    { key: 'dose' as const, label: 'Dose', value: '10 mg · 1 tablet' },
    { key: 'freq' as const, label: 'Frequency', value: 'Once daily · morning' },
    { key: 'dur' as const, label: 'Duration', value: '90 days' },
    { key: 'refill' as const, label: 'Refills', value: '2 remaining' },
  ],
  instructions:
    'Take one tablet by mouth in the morning. Take with or without food. Avoid potassium-rich salt substitutes.',
} as const;

export const CARE_HISTORY_STATS = [
  { n: '3', l: 'Conditions' },
  { n: '12', l: 'Visits' },
  { n: '7', l: 'Reports' },
] as const;

export type HistoryTag = 'Visit' | 'Lab' | 'Rx' | 'Dx';

export interface CareHistoryTimelineItem {
  year?: string;
  d: string;
  title: string;
  sub: string;
  tag: HistoryTag;
  color: string;
}

export const CARE_HISTORY_TIMELINE: CareHistoryTimelineItem[] = [
  { year: '2026', d: 'Apr 10', title: 'Follow-up — Cardiology', sub: 'Dr. Nguyen Lan', tag: 'Visit', color: 'var(--brand)' },
  { d: 'Mar 18', title: 'Blood panel', sub: 'Sunrise Clinic · Fasting', tag: 'Lab', color: 'var(--accent)' },
  { d: 'Mar 3', title: 'Lisinopril prescribed', sub: '10 mg · 1×/day', tag: 'Rx', color: '#E3B79A' },
  { year: '2025', d: 'Dec 12', title: 'Hypertension diagnosed', sub: 'Stage 1 · monitoring', tag: 'Dx', color: 'var(--warning, #D97706)' },
  { d: 'Oct 2', title: 'Annual physical', sub: 'Dr. Tran Van Minh', tag: 'Visit', color: 'var(--brand)' },
];

export type AttachmentRowState = 'uploading' | 'done' | 'error';

export interface CareAttachmentRow {
  id: string;
  name: string;
  sub: string;
  state: AttachmentRowState;
  progress?: number;
}

export const CARE_ATTACHMENTS: { rows: CareAttachmentRow[] } = {
  rows: [
    {
      id: 'a1',
      name: 'ECG_scan_Apr24.png',
      sub: 'Uploading · 2.3 MB',
      state: 'uploading',
      progress: 0.64,
    },
    {
      id: 'a2',
      name: 'Lab_results_Apr10.pdf',
      sub: '482 KB · Uploaded',
      state: 'done',
    },
    {
      id: 'a3',
      name: 'insurance_card.jpg',
      sub: 'Upload failed — tap to retry',
      state: 'error',
    },
    {
      id: 'a4',
      name: 'BP_log_2weeks.csv',
      sub: '12 KB · Uploaded',
      state: 'done',
    },
  ],
};
