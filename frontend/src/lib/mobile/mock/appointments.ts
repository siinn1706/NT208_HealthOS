/** Mock data for the Appointments screen. */

export const APT_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const APT_DATES = [20, 21, 22, 23, 24, 25, 26];
export const APT_TODAY_IDX = 4;
export const APT_EVENT_IDXS = [1, 4, 6];

export const APT_HERO = {
  name: 'Dr. Nguyen Thi Lan',
  specialty: 'Cardiology · Follow-up',
  countdown: 'In 2h 14m',
  time: '11:30 AM',
  mode: 'Video call',
};

export const APT_THIS_WEEK = [
  { dow: 'FRI', dd: '26', title: 'Dr. Tran Van Minh', sub: 'General practice · Checkup', time: '09:00', type: 'In-person', icon: 'mapPin' as const },
  { dow: 'MON', dd: '29', title: 'Lab tests',          sub: 'Fasting blood panel',         time: '07:30', type: 'Sunrise Clinic', icon: 'stethoscope' as const },
];
