import type { ChipVariant } from '../components/primitives/chip';
import type {
  Adherence,
  Appointment,
  Conversation,
  CurrentUser,
  DashboardSummary,
  MedicationDose,
  MedicationPlan,
  MedicationPlanDetail,
  Message,
  Reminder,
  VitalPoint,
} from '../../../shared/api-contracts';

export type DoseState = 'taken' | 'due' | 'missed' | 'upcoming' | 'skipped';

export interface WeekDay {
  label: string;
  date: number;
  isToday?: boolean;
  hasEvent?: boolean;
}

const KPI_COLORS = ['#1965B3', '#12A88A', '#F59E0B', '#8B5CF6'];

const KPI_ICONS: Record<string, string> = {
  steps: 'IconFootprints',
  steps_count: 'IconFootprints',
  water: 'IconWater',
  water_intake: 'IconWater',
  calories: 'IconFire',
  kcal: 'IconFire',
  energy: 'IconFire',
  sleep: 'IconMoon',
  sleep_hours: 'IconMoon',
};

export function toHomeView(summary: DashboardSummary, reminders: Reminder[], vitals: VitalPoint[]) {
  const goals = summary.goals ?? [];
  const kpis = Object.entries(summary.kpis ?? {})
    .slice(0, 4)
    .map(([key, value], index) => {
      const current = value.current ?? 0;
      const target = (value.target ?? current) || 1;
      return {
        id: key,
        label: labelize(key),
        val: formatMetric(current, key),
        tgt: formatMetric(target, key),
        v: clampRatio(current, target),
        color: KPI_COLORS[index % KPI_COLORS.length],
        icon: KPI_ICONS[key] ?? 'IconActivity',
      };
    });

  const fallbackGoalScore = goals.length
    ? average(goals.map((goal) => clampRatio(goal.current ?? 0, goal.target ?? 0))) * 100
    : 0;
  const healthScore = Math.round(summary.kpis.health_score?.current ?? fallbackGoalScore);
  const vitalValues = vitals.map((point) => point.heart_rate).filter((v): v is number => typeof v === 'number');
  const avg = Math.round(average(vitalValues));
  const first = vitalValues[0] ?? 0;
  const last = vitalValues[vitalValues.length - 1] ?? first;

  return {
    score: {
      value: healthScore,
      target: Math.round(summary.kpis.health_score?.target ?? 100),
      copy: healthScore > 0 ? 'Based on your current goals and health signals.' : 'Connect health data to calculate your score.',
    },
    kpis,
    nextUp: reminders.slice(0, 4).map((reminder) => ({
      id: reminder.id,
      time: formatTime(reminder.next_occurrence_at ?? reminder.due_at),
      title: reminder.title,
      meta: labelize(reminder.type),
      icon: reminder.type === 'medicine' ? 'IconPill' : reminder.type === 'appointment' ? 'IconVideo' : 'IconCoffee',
      badge: reminder.done ? { label: 'Done', variant: 'success' as ChipVariant } : { label: 'Due', variant: 'brand' as ChipVariant },
    })),
    aiInsight: summary.ai_insight
      ? {
          title: summary.ai_insight.category ? labelize(summary.ai_insight.category) : 'Personal insight',
          body: summary.ai_insight.text,
        }
      : null,
    vitals: {
      avg,
      trend: vitalValues.length ? vitalValues : [0],
      deltaBpm: Math.round(last - first),
    },
  };
}

export function makeWeekDays(appointments: Appointment[]): WeekDay[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    return {
      label: day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3),
      date: day.getDate(),
      isToday: index === 0,
      hasEvent: appointments.some((apt) => sameDay(new Date(apt.appointment_date), day)),
    };
  });
}

export function toAppointmentRow(appointment: Appointment) {
  const date = new Date(appointment.appointment_date);
  return {
    id: appointment.id,
    dayLabel: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3),
    date: date.getDate(),
    time: formatTime(appointment.appointment_date),
    doctor: appointment.doctor_name,
    specialty: appointment.specialty ?? 'Appointment',
    location: appointment.clinic ?? 'Clinic not specified',
    type: appointment.status,
    badge: statusBadge(appointment.status),
  };
}

export function toHeroAppointment(appointment: Appointment) {
  return {
    id: appointment.id,
    countdown: relativeAppointment(appointment.appointment_date),
    doctor: appointment.doctor_name,
    specialty: appointment.specialty ?? 'Appointment',
    location: appointment.clinic ?? 'Clinic not specified',
    type: appointment.status,
  };
}

export function toDoseRow(dose: MedicationDose) {
  return {
    id: dose.occurrence_id,
    time: formatTime(dose.scheduled_at),
    name: dose.plan_name,
    note: dose.strength ?? dose.status,
    state: doseState(dose.status),
    reminderId: dose.reminder_id,
    occurrenceId: dose.occurrence_id,
  };
}

export function toMedicationCard(plan: MedicationPlan, adherence?: Adherence | null) {
  const refillDays = daysUntil(plan.next_refill_estimated_at);
  return {
    id: plan.id,
    name: plan.name,
    dose: [plan.strength, plan.form].filter(Boolean).join(' · ') || `${plan.dose_count} dose schedules`,
    adherence: adherence ? normalizePercent(adherence.percent) : 0,
    refillDays: refillDays ?? 0,
    color: plan.status === 'paused' ? '#F59E0B' : '#12A88A',
  };
}

export function toMedicationDetailRows(plan: MedicationPlanDetail) {
  return [
    { label: 'Dose', val: [plan.strength, plan.form].filter(Boolean).join(' · ') || 'Not specified' },
    { label: 'Schedule', val: plan.doses.map((dose) => dose.time).join(', ') || 'No active dose schedule' },
    { label: 'Prescriber', val: plan.prescriber ?? 'Not specified' },
    { label: 'Started', val: formatDate(plan.start_date) },
  ];
}

export function toConversationRow(conversation: Conversation, currentUserId?: string | null) {
  const peer = conversation.participants.find((p) => p.id !== currentUserId) ?? conversation.participants[0];
  const name = conversation.title ?? peer?.display_name ?? (conversation.type === 'ai' ? 'HealthOS AI' : 'Conversation');
  return {
    id: conversation.id,
    name,
    role: conversation.type === 'ai' ? 'AI assistant' : peer?.role ?? 'Care team',
    last: conversation.last_message?.is_recalled ? 'Message removed' : conversation.last_message?.content ?? 'No messages yet',
    time: formatShortTime(conversation.last_message?.created_at ?? conversation.updated_at),
    unread: conversation.unread_count,
    online: Boolean(peer?.is_online || conversation.type === 'ai'),
  };
}

export function toBubble(message: Message, currentUserId?: string | null) {
  const isMe = message.sender_id === currentUserId && message.sender_kind !== 'ai';
  return {
    id: message.id,
    side: isMe ? 'me' as const : 'ai' as const,
    text: message.is_recalled ? 'Message removed' : message.content,
    time: formatShortTime(message.created_at),
  };
}

export function toIdentity(user: CurrentUser | null) {
  const dob = user?.date_of_birth ? new Date(user.date_of_birth) : null;
  const age = dob && !Number.isNaN(dob.getTime()) ? new Date().getFullYear() - dob.getFullYear() : 0;
  return {
    name: user?.full_name ?? user?.display_name ?? 'HealthOS user',
    email: user?.email,
    age,
    gender: user?.gender ?? 'Not set',
    city: user?.address ? user.address.split(',').pop()?.trim() || 'Not set' : 'Not set',
    level: user?.onboarding_status === 'completed' ? 2 : 1,
    verified: Boolean(user),
  };
}

export function toProfileStats(user: CurrentUser | null) {
  return [
    { id: 'height', label: 'Height', value: user?.height_cm ? `${Math.round(user.height_cm)} cm` : '-' },
    { id: 'weight', label: 'Weight', value: user?.weight_kg ? `${Math.round(user.weight_kg)} kg` : '-' },
    { id: 'blood',  label: 'Blood',  value: user?.blood_type ?? '-' },
  ];
}

export const profileMenuGroups = [
  {
    title: 'Health',
    items: [
      { id: 'profile', label: 'Health profile', icon: 'IconUser', type: 'nav' as const },
      { id: 'devices', label: 'Connected devices', icon: 'IconActivity', type: 'nav' as const },
      { id: 'emergency', label: 'Emergency info', icon: 'IconHeartPulse', type: 'nav' as const },
      { id: 'goals', label: 'Goals & Streaks', icon: 'IconTarget', type: 'nav' as const },
      { id: 'achievements', label: 'Achievements', icon: 'IconBadge', type: 'nav' as const },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { id: 'security', label: 'Security', icon: 'IconShield', type: 'nav' as const },
      { id: 'app-lock', label: 'App lock', icon: 'IconLock', type: 'toggle' as const, defaultVal: false },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'notifications', label: 'Notifications', icon: 'IconBell', type: 'nav' as const },
      { id: 'language', label: 'Language', icon: 'IconGlobe', type: 'nav' as const, val: 'EN' },
      { id: 'appearance', label: 'Appearance', icon: 'IconSun', type: 'nav' as const },
      { id: 'logout', label: 'Sign out', icon: 'IconLogOut', type: 'danger' as const },
    ],
  },
];

function labelize(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampRatio(current: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(1, current / target));
}

function normalizePercent(value: number) {
  return value > 1 ? value / 100 : value;
}

function formatMetric(value: number, key: string) {
  if (key.includes('sleep')) return `${Math.round(value / 60)}h`;
  if (key.includes('water')) return value >= 1000 ? `${(value / 1000).toFixed(1)}L` : `${Math.round(value)}ml`;
  if (key.includes('calorie') || key.includes('kcal')) return `${Math.round(value)} kcal`;
  if (key.includes('step')) return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;
  return `${Math.round(value)}`;
}

export function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatShortTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function relativeAppointment(value: string) {
  const deltaMs = new Date(value).getTime() - Date.now();
  const days = Math.ceil(deltaMs / 86400000);
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function statusBadge(status: Appointment['status']): { label: string; variant: ChipVariant } {
  if (status === 'completed') return { label: 'Done', variant: 'success' };
  if (status === 'cancelled' || status === 'no_show') return { label: labelize(status), variant: 'danger' };
  if (status === 'in_progress') return { label: 'Now', variant: 'warning' };
  return { label: labelize(status), variant: 'brand' };
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function doseState(status: string): DoseState {
  const normalized = status.toLowerCase();
  if (normalized.includes('taken') || normalized.includes('done') || normalized.includes('completed')) return 'taken';
  if (normalized.includes('miss')) return 'missed';
  if (normalized.includes('skip')) return 'skipped';
  if (normalized.includes('pending') || normalized.includes('due')) return 'due';
  return 'upcoming';
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}
