/**
 * Medication detail mocks (Phase 6). Any `[id]` resolves to the same demo record.
 * Catalog default id: `med1`.
 */
export const MEDS_CATALOG_DEMO_ID = 'med1';

export type MedDoseState = 'taken' | 'upcoming' | 'missed';

export interface MedTodayDose {
  time: string;
  state: MedDoseState;
  label: string;
  primaryLine: string;
}

export interface MedDetail {
  name: string;
  strengthLine: string;
  statusTag: 'Active';
  adherence30d: number;
  /** e.g. "28/30" for ring center */
  adherenceRingLabel: string;
  /** 30 bars: 1 = on track */
  adherenceSeries: (0 | 1)[];
  todayDoses: MedTodayDose[];
  details: {
    dose: string;
    schedule: string;
    prescriber: string;
    started: string;
    refills: string;
  };
  lowSupply: { title: string; sub: string; daysLabel: string };
  missedSummary: { title: string; sub: string };
  takeConfirm: { scheduledLine: string; doseLine: string };
  historyIntro: { periodLabel: string; stats: { adherence: string; taken: string; missed: string } };
  historyWeek: {
    thisWeek: MedHistRow[];
    lastWeek: MedHistRow[];
  };
  refill: {
    headerTitle: string;
    countLarge: string;
    countSub: string;
    footer: string;
    rows: { date: string; qty: string; src: string; status: string }[];
  };
  importCopy: string;
  importSources: { name: string; sub: string; connected: boolean }[];
  importPending: { name: string; sub: string; selected: boolean }[];
  addDefaults: { name: string; strength: string; form: string; time: string; freqIndex: number };
  editDefaults: { notes: string };
}

export type MedHistState = 'taken' | 'missed' | 'late';

export interface MedHistRow {
  date: string;
  dose: string;
  state: MedHistState;
}

const ADHERENCE_30: (0 | 1)[] = [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export const MED_DETAIL_DEMO: MedDetail = {
  name: 'Lisinopril',
  strengthLine: '10 mg · Tablet',
  statusTag: 'Active',
  adherence30d: 0.94,
  adherenceRingLabel: '28/30',
  adherenceSeries: ADHERENCE_30,
  todayDoses: [
    { time: '07:30', state: 'taken', label: 'Taken · 07:28', primaryLine: 'Lisinopril 10 mg' },
    { time: '19:30', state: 'upcoming', label: 'In 7h 45m', primaryLine: 'Lisinopril 10 mg' },
  ],
  details: {
    dose: '10 mg · 1 tablet',
    schedule: 'Twice daily · 07:30, 19:30',
    prescriber: 'Dr. Nguyen Lan',
    started: 'Mar 3, 2026',
    refills: '2 of 3',
  },
  lowSupply: { title: 'Running low · 6 days left', sub: 'Request a refill to avoid gaps', daysLabel: '6' },
  missedSummary: { title: 'Missed · Lisinopril', sub: 'Scheduled for 19:30 yesterday' },
  takeConfirm: { scheduledLine: 'Next dose · 07:30', doseLine: 'Lisinopril 10 mg · 1 tablet' },
  historyIntro: { periodLabel: 'Since start · 52 days', stats: { adherence: '94%', taken: '98', missed: '6' } },
  historyWeek: {
    thisWeek: [
      { date: 'Apr 24', dose: '07:28', state: 'taken' },
      { date: 'Apr 23', dose: '19:31 · 07:30', state: 'taken' },
      { date: 'Apr 22', dose: 'Missed evening', state: 'missed' },
      { date: 'Apr 21', dose: '19:28 · 07:14', state: 'taken' },
    ],
    lastWeek: [
      { date: 'Apr 20', dose: '19:45 · 07:40', state: 'taken' },
      { date: 'Apr 19', dose: '19:30 · 07:28', state: 'taken' },
      { date: 'Apr 18', dose: '20:12 · 08:15', state: 'late' },
    ],
  },
  refill: {
    headerTitle: 'Running low',
    countLarge: '6',
    countSub: 'tablets · 6 days',
    footer: 'Prescription expires Jun 10, 2026 · 2 refills left',
    rows: [
      { date: 'Mar 20', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
      { date: 'Feb 21', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
      { date: 'Jan 18', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
      { date: 'Dec 15', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
    ],
  },
  importCopy:
    'Pull medications from your prescriber or pharmacy. Review before confirming.',
  importSources: [
    { name: 'Dr. Nguyen Lan · e-prescription', sub: 'Connected · last sync 2h ago', connected: true },
    { name: 'Sunrise Pharmacy', sub: 'Tap to connect', connected: false },
    { name: 'Apple Health / Health Connect', sub: 'Import history', connected: false },
  ],
  importPending: [
    { name: 'Metformin 500 mg', sub: 'Dr. Nguyen Lan · 2×/day', selected: true },
    { name: 'Atorvastatin 20 mg', sub: 'Dr. Nguyen Lan · 1×/day evening', selected: true },
    { name: 'Vitamin D3 1000 IU', sub: 'OTC · 1×/day', selected: false },
  ],
  addDefaults: { name: 'Metformin', strength: '500 mg', form: 'Tablet', time: '08:00', freqIndex: 0 },
  editDefaults: { notes: 'Take with breakfast and dinner.' },
};

export function getMedicationDetail(id: string): MedDetail {
  void id;
  return MED_DETAIL_DEMO;
}
