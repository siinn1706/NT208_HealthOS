export const adherence = { percent: 0.94, taken: 28, total: 30, missed: 2 };

export const refillAlert = {
  name: 'Metformin',
  daysLeft: 4,
  message: 'Metformin runs out in 4 days',
};

export type DoseState = 'taken' | 'due' | 'pending';

export const todayDoses = [
  { id: '1', time: '8:00 AM',  name: 'Metformin 500 mg',    note: 'With breakfast',  state: 'taken'   as DoseState },
  { id: '2', time: '8:00 AM',  name: 'Atorvastatin 20 mg',  note: 'With breakfast',  state: 'taken'   as DoseState },
  { id: '3', time: '1:00 PM',  name: 'Lisinopril 10 mg',    note: 'With lunch',      state: 'due'     as DoseState },
  { id: '4', time: '8:00 PM',  name: 'Metformin 500 mg',    note: 'With dinner',     state: 'pending' as DoseState },
];

export const activeMeds = [
  { id: '1', name: 'Metformin',     dose: '500 mg · twice daily',    adherence: 0.96, refillDays: 4,  color: '#1965B3' },
  { id: '2', name: 'Lisinopril',    dose: '10 mg · once daily',      adherence: 0.93, refillDays: 18, color: '#059669' },
  { id: '3', name: 'Atorvastatin',  dose: '20 mg · once daily',      adherence: 0.89, refillDays: 22, color: '#7C3AED' },
];
