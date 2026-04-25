export type WeekDay = { label: string; date: number; hasEvent: boolean; isToday: boolean };

export const weekDays: WeekDay[] = [
  { label: 'Sun', date: 20, hasEvent: false, isToday: false },
  { label: 'Mon', date: 21, hasEvent: true,  isToday: false },
  { label: 'Tue', date: 22, hasEvent: false, isToday: false },
  { label: 'Wed', date: 23, hasEvent: false, isToday: false },
  { label: 'Thu', date: 24, hasEvent: true,  isToday: true  },
  { label: 'Fri', date: 25, hasEvent: false, isToday: false },
  { label: 'Sat', date: 26, hasEvent: true,  isToday: false },
];

export const heroAppointment = {
  countdown: 'In 2h 14m',
  doctor: 'Dr. Nguyen Thi Lan',
  specialty: 'Endocrinologist',
  location: 'FV Hospital · Room 304',
  type: 'Video call',
};

export const upcomingAppointments = [
  {
    id: '1',
    dayLabel: 'FRI',
    date: 25,
    time: '14:00',
    doctor: 'Dr. Tran Van Minh',
    specialty: 'Cardiologist',
    location: 'Vinmec Central Park',
    type: 'In-person',
    badge: { label: 'Confirmed', variant: 'success' as const },
  },
  {
    id: '2',
    dayLabel: 'MON',
    date: 28,
    time: '09:30',
    doctor: 'Dr. Le Thi Hoa',
    specialty: 'General Practice',
    location: 'District 1 Medical',
    type: 'Video call',
    badge: { label: 'Pending', variant: 'warning' as const },
  },
];
