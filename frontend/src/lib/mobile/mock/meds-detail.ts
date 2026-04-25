/** Mock data for the Medication Detail screens. */

export const MED_DETAIL = {
  name: 'Lisinopril',
  dose: '10 mg',
  form: 'Tablet',
  status: 'Active',
  adherencePct: '94%',
  adherenceValue: 0.94,
  adherenceLabel: '28/30',
  /** 1 = taken, 0 = missed — 30 days */
  adherenceSeries: [1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1] as number[],
  schedule: 'Twice daily · 07:30, 19:30',
  prescriber: 'Dr. Nguyen Lan',
  started: 'Mar 3, 2026',
  refillsLeft: '2 of 3',
  lowWarningDays: 6,
};

export const MED_TODAY_DOSES = [
  { time: '07:30', state: 'taken' as const,    label: 'Taken · 07:28' },
  { time: '19:30', state: 'upcoming' as const, label: 'In 7h 45m' },
];

export const MED_HISTORY_STATS = {
  daysSinceStart: 52,
  adherence: '94%',
  dosesTaken: 98,
  missed: 6,
};

export const MED_HISTORY_ROWS = [
  { section: 'THIS WEEK', rows: [
    { date: 'Apr 24', dose: '07:28',             state: 'taken'  as const },
    { date: 'Apr 23', dose: '19:31 · 07:30',     state: 'taken'  as const },
    { date: 'Apr 22', dose: 'Missed evening',    state: 'missed' as const },
    { date: 'Apr 21', dose: '19:28 · 07:14',     state: 'taken'  as const },
  ]},
  { section: 'LAST WEEK', rows: [
    { date: 'Apr 20', dose: '19:45 · 07:40', state: 'taken' as const },
    { date: 'Apr 19', dose: '19:30 · 07:28', state: 'taken' as const },
    { date: 'Apr 18', dose: '20:12 · 08:15', state: 'late'  as const },
  ]},
];

export const MED_REFILL_ROWS = [
  { date: 'Mar 20', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
  { date: 'Feb 21', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
  { date: 'Jan 18', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
  { date: 'Dec 15', qty: '30 tablets', src: 'Sunrise Pharmacy', status: 'Filled' },
];

export const MED_REFILL_BANNER = {
  tabletsLeft: 6,
  daysLeft: 6,
  expires: 'Jun 10, 2026',
  refillsLeft: 2,
};

export const MED_IMPORT_SOURCES = [
  { name: "Dr. Nguyen Lan · e-prescription", sub: "Connected · last sync 2h ago", on: true },
  { name: "Sunrise Pharmacy",               sub: "Tap to connect",                on: false },
  { name: "Apple Health / Health Connect",  sub: "Import history",                on: false },
];

export const MED_IMPORT_PENDING = [
  { name: 'Metformin 500 mg',       sub: 'Dr. Nguyen Lan · 2×/day',        selected: true  },
  { name: 'Atorvastatin 20 mg',     sub: 'Dr. Nguyen Lan · 1×/day evening',selected: true  },
  { name: 'Vitamin D3 1000 IU',     sub: 'OTC · 1×/day',                   selected: false },
];
