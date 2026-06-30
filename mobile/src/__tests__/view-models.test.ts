/* eslint-env jest */
import {
  toHomeView,
  makeWeekDays,
  toAppointmentRow,
  toHeroAppointment,
  toDoseRow,
  toMedicationCard,
  toMedicationDetailRows,
  toConversationRow,
  toBubble,
  toIdentity,
  toProfileStats,
  formatDate,
  formatTime,
} from '../api/viewModels';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeSummary = (overrides = {}) => ({
  goals: [],
  kpis: {
    steps: { current: 8000, target: 10000 },
    health_score: { current: 78, target: 100 },
  },
  ai_insight: null,
  ...overrides,
});

const makeAppointment = (overrides = {}) => ({
  id: 'apt1',
  appointment_date: '2026-06-10T09:00:00Z',
  doctor_name: 'Dr. Smith',
  specialty: 'Cardiology',
  clinic: 'City Clinic',
  status: 'scheduled',
  ...overrides,
});

const makeDose = (overrides = {}) => ({
  occurrence_id: 'occ1',
  scheduled_at: '2026-06-02T08:00:00Z',
  plan_name: 'Aspirin',
  strength: '100mg',
  status: 'pending_due',
  reminder_id: 'rem1',
  ...overrides,
});

const makePlan = (overrides = {}) => ({
  id: 'plan1',
  name: 'Metformin',
  strength: '500mg',
  form: 'tablet',
  dose_count: 2,
  status: 'active',
  next_refill_estimated_at: null,
  ...overrides,
});

const makePlanDetail = (overrides = {}) => ({
  id: 'plan1',
  name: 'Metformin',
  strength: '500mg',
  form: 'tablet',
  doses: [{ time: '08:00' }, { time: '20:00' }],
  prescriber: 'Dr. Jones',
  start_date: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeConversation = (overrides = {}) => ({
  id: 'conv1',
  type: 'direct',
  title: null,
  participants: [
    { id: 'u1', display_name: 'Alice', role: 'doctor', is_online: true },
    { id: 'u2', display_name: 'Bob', role: 'patient', is_online: false },
  ],
  last_message: {
    id: 'm1',
    content: 'Hello',
    is_recalled: false,
    created_at: '2026-06-02T07:00:00Z',
  },
  unread_count: 2,
  updated_at: '2026-06-02T07:00:00Z',
  ...overrides,
});

const makeMessage = (overrides = {}) => ({
  id: 'msg1',
  sender_id: 'u1',
  sender_kind: 'human',
  content: 'Hi there',
  is_recalled: false,
  created_at: '2026-06-02T07:00:00Z',
  attachments: [],
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  id: 'u1',
  full_name: 'Alice Nguyen',
  display_name: 'alice',
  email: 'alice@example.com',
  gender: 'female',
  date_of_birth: '1990-01-01',
  height_cm: 165,
  weight_kg: 58,
  blood_type: 'A+',
  onboarding_status: 'completed',
  address: 'District 1, Ho Chi Minh City',
  ...overrides,
});

// ─── toHomeView ────────────────────────────────────────────────────────────────

describe('toHomeView', () => {
  it('returns health score from kpis.health_score.current', () => {
    const result = toHomeView(makeSummary() as any, [], []);
    expect(result.score.value).toBe(78);
    expect(result.score.target).toBe(100);
  });

  it('returns copy for score > 0', () => {
    const result = toHomeView(makeSummary() as any, [], []);
    expect(result.score.copy).toContain('goals');
  });

  it('returns connect-data copy when score is 0', () => {
    const summary = makeSummary({ kpis: { health_score: { current: 0, target: 100 } } });
    const result = toHomeView(summary as any, [], []);
    expect(result.score.copy).toContain('Connect');
  });

  it('maps kpi entries to ring items', () => {
    const result = toHomeView(makeSummary() as any, [], []);
    expect(result.kpis.length).toBeGreaterThan(0);
    expect(result.kpis[0]).toMatchObject({ id: 'steps', v: expect.any(Number) });
  });

  it('renders known Health Connect camelCase KPI labels and units', () => {
    const summary = makeSummary({
      kpis: {
        caloriesBurned: { current: 40, target: 2000 },
        sleepScore: { current: 0, target: 100 },
        heartRate: { current: 72, target: 100 },
        steps: { current: 1000, target: 10000 },
      },
    });

    const result = toHomeView(summary as any, [], []);

    expect(result.kpis[0]).toMatchObject({ label: 'Calories burned', val: '40 kcal', tgt: '2000 kcal' });
    expect(result.kpis[1]).toMatchObject({ label: 'Sleep score', val: '0 pts', tgt: '100 pts' });
    expect(result.kpis[2]).toMatchObject({ label: 'Heart rate', val: '72 bpm', tgt: '100 bpm' });
    expect(result.kpis[3]).toMatchObject({ label: 'Steps', val: '1.0k', tgt: '10.0k' });
  });

  it('splits fallback camelCase labels without changing duration sleep metrics', () => {
    const summary = makeSummary({
      kpis: {
        activeMinutes: { current: 15, target: 30 },
        sleepMinutes: { current: 120, target: 480 },
      },
    });

    const result = toHomeView(summary as any, [], []);

    expect(result.kpis[0]).toMatchObject({ label: 'Active Minutes', val: '15', tgt: '30' });
    expect(result.kpis[1]).toMatchObject({ label: 'Sleep minutes', val: '2h', tgt: '8h' });
  });

  it('maps reminders to nextUp items', () => {
    const reminder = {
      id: 'r1',
      title: 'Take Aspirin',
      type: 'medicine',
      next_occurrence_at: '2026-06-02T08:00:00Z',
      due_at: null,
      done: false,
    };
    const result = toHomeView(makeSummary() as any, [reminder as any], []);
    expect(result.nextUp[0].title).toBe('Take Aspirin');
    expect(result.nextUp[0].icon).toBe('IconPill');
    expect(result.nextUp[0].badge.label).toBe('Due');
  });

  it('marks done reminder with Done badge', () => {
    const reminder = {
      id: 'r1', title: 'Walk', type: 'exercise',
      next_occurrence_at: null, due_at: '2026-06-02T08:00:00Z', done: true,
    };
    const result = toHomeView(makeSummary() as any, [reminder as any], []);
    expect(result.nextUp[0].badge.label).toBe('Done');
  });

  it('extracts ai_insight when present', () => {
    const summary = makeSummary({ ai_insight: { category: 'nutrition', text: 'Eat more veggies' } });
    const result = toHomeView(summary as any, [], []);
    expect(result.aiInsight?.body).toBe('Eat more veggies');
    expect(result.aiInsight?.title).toBe('Nutrition');
  });

  it('sets aiInsight to null when absent', () => {
    const result = toHomeView(makeSummary() as any, [], []);
    expect(result.aiInsight).toBeNull();
  });

  it('computes vitals avg and delta from VitalPoints', () => {
    const vitals = [
      { heart_rate: 70 },
      { heart_rate: 80 },
    ];
    const result = toHomeView(makeSummary() as any, [], vitals as any);
    expect(result.vitals.avg).toBe(75);
    expect(result.vitals.deltaBpm).toBe(10);
  });

  it('falls back to [0] trend when no vitals', () => {
    const result = toHomeView(makeSummary() as any, [], []);
    expect(result.vitals.trend).toEqual([0]);
  });
});

// ─── makeWeekDays ──────────────────────────────────────────────────────────────

describe('makeWeekDays', () => {
  it('returns 7 days starting from today', () => {
    const result = makeWeekDays([]);
    expect(result).toHaveLength(7);
    expect(result[0].isToday).toBe(true);
    expect(result[1].isToday).toBeFalsy();
  });

  it('marks a day as having an event when appointment matches', () => {
    const today = new Date();
    const todayStr = today.toISOString();
    const appt = makeAppointment({ appointment_date: todayStr });
    const result = makeWeekDays([appt as any]);
    expect(result[0].hasEvent).toBe(true);
  });
});

// ─── toAppointmentRow ─────────────────────────────────────────────────────────

describe('toAppointmentRow', () => {
  it('maps appointment fields', () => {
    const result = toAppointmentRow(makeAppointment() as any);
    expect(result.id).toBe('apt1');
    expect(result.doctor).toBe('Dr. Smith');
    expect(result.specialty).toBe('Cardiology');
    expect(result.location).toBe('City Clinic');
  });

  it('defaults specialty and location when missing', () => {
    const appt = makeAppointment({ specialty: undefined, clinic: undefined });
    const result = toAppointmentRow(appt as any);
    expect(result.specialty).toBe('Appointment');
    expect(result.location).toBe('Clinic not specified');
  });

  it('maps completed status to Done badge', () => {
    const result = toAppointmentRow(makeAppointment({ status: 'completed' }) as any);
    expect(result.badge.label).toBe('Done');
    expect(result.badge.variant).toBe('success');
  });

  it('maps cancelled status to danger badge', () => {
    const result = toAppointmentRow(makeAppointment({ status: 'cancelled' }) as any);
    expect(result.badge.variant).toBe('danger');
  });

  it('maps in_progress status to Now badge', () => {
    const result = toAppointmentRow(makeAppointment({ status: 'in_progress' }) as any);
    expect(result.badge.label).toBe('Now');
  });
});

// ─── toHeroAppointment ────────────────────────────────────────────────────────

describe('toHeroAppointment', () => {
  it('includes countdown label', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const result = toHeroAppointment(makeAppointment({ appointment_date: future.toISOString() }) as any);
    expect(result.countdown).toContain('days');
  });

  it('shows Today for same-day appointment', () => {
    const todayNoon = new Date();
    todayNoon.setHours(23, 59, 0, 0);
    const result = toHeroAppointment(makeAppointment({ appointment_date: todayNoon.toISOString() }) as any);
    expect(['Today', 'Tomorrow']).toContain(result.countdown);
  });
});

// ─── toDoseRow ────────────────────────────────────────────────────────────────

describe('toDoseRow', () => {
  it('maps dose fields', () => {
    const result = toDoseRow(makeDose() as any);
    expect(result.id).toBe('occ1');
    expect(result.name).toBe('Aspirin');
    expect(result.state).toBe('due');
  });

  it('maps taken status', () => {
    const result = toDoseRow(makeDose({ status: 'taken' }) as any);
    expect(result.state).toBe('taken');
  });

  it('maps missed status', () => {
    const result = toDoseRow(makeDose({ status: 'missed' }) as any);
    expect(result.state).toBe('missed');
  });

  it('maps skipped status', () => {
    const result = toDoseRow(makeDose({ status: 'skipped' }) as any);
    expect(result.state).toBe('skipped');
  });

  it('maps unknown status to upcoming', () => {
    const result = toDoseRow(makeDose({ status: 'future' }) as any);
    expect(result.state).toBe('upcoming');
  });
});

// ─── toMedicationCard ─────────────────────────────────────────────────────────

describe('toMedicationCard', () => {
  it('formats dose string from strength + form', () => {
    const result = toMedicationCard(makePlan() as any);
    expect(result.dose).toBe('500mg · tablet');
  });

  it('falls back to dose_count when no strength/form', () => {
    const result = toMedicationCard(makePlan({ strength: undefined, form: undefined }) as any);
    expect(result.dose).toContain('dose schedules');
  });

  it('normalizes adherence percent', () => {
    const result = toMedicationCard(makePlan() as any, { percent: 85 } as any);
    expect(result.adherence).toBeCloseTo(0.85);
  });

  it('uses warning color for paused plans', () => {
    const result = toMedicationCard(makePlan({ status: 'paused' }) as any);
    expect(result.color).toBe('#F59E0B');
  });
});

// ─── toMedicationDetailRows ───────────────────────────────────────────────────

describe('toMedicationDetailRows', () => {
  it('returns 4 rows', () => {
    const result = toMedicationDetailRows(makePlanDetail() as any);
    expect(result).toHaveLength(4);
  });

  it('includes dose, schedule, prescriber, started', () => {
    const result = toMedicationDetailRows(makePlanDetail() as any);
    const labels = result.map((r) => r.label);
    expect(labels).toEqual(['Dose', 'Schedule', 'Prescriber', 'Started']);
  });

  it('joins dose times with comma', () => {
    const result = toMedicationDetailRows(makePlanDetail() as any);
    expect(result[1].val).toBe('08:00, 20:00');
  });
});

// ─── toConversationRow ────────────────────────────────────────────────────────

describe('toConversationRow', () => {
  it('picks the peer name based on currentUserId', () => {
    const result = toConversationRow(makeConversation() as any, 'u2');
    expect(result.name).toBe('Alice');
  });

  it('shows recalled message text', () => {
    const conv = makeConversation({
      last_message: { id: 'm1', content: 'secret', is_recalled: true, created_at: '2026-06-02T07:00:00Z' },
    });
    const result = toConversationRow(conv as any, 'u2');
    expect(result.last).toBe('Message removed');
  });

  it('marks AI conversation as online', () => {
    const conv = makeConversation({ type: 'ai', participants: [] });
    const result = toConversationRow(conv as any, 'u1');
    expect(result.online).toBe(true);
    expect(result.role).toBe('AI assistant');
  });

  it('shows no-messages fallback when last_message null', () => {
    const conv = makeConversation({ last_message: null });
    const result = toConversationRow(conv as any, 'u2');
    expect(result.last).toBe('No messages yet');
  });
});

// ─── toBubble ─────────────────────────────────────────────────────────────────

describe('toBubble', () => {
  it('marks message as mine when sender_id matches', () => {
    const result = toBubble(makeMessage({ sender_id: 'u1' }) as any, 'u1');
    expect(result.side).toBe('me');
  });

  it('marks AI message as ai side', () => {
    const result = toBubble(makeMessage({ sender_kind: 'ai' }) as any, 'u1');
    expect(result.side).toBe('ai');
  });

  it('replaces recalled message content', () => {
    const result = toBubble(makeMessage({ is_recalled: true }) as any, 'u2');
    expect(result.text).toBe('Message removed');
  });

  it('normalizes valid attachments', () => {
    const attachments = [{ url: 'https://cdn.x.com/file.pdf', name: 'report.pdf', size: 1024, mime_type: 'application/pdf' }];
    const result = toBubble(makeMessage({ attachments }) as any, 'u2');
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].name).toBe('report.pdf');
  });

  it('skips attachments missing url or name', () => {
    const attachments = [{ url: null, name: null, size: 0, mime_type: 'image/png' }];
    const result = toBubble(makeMessage({ attachments }) as any, 'u2');
    expect(result.attachments).toHaveLength(0);
  });
});

// ─── toIdentity ───────────────────────────────────────────────────────────────

describe('toIdentity', () => {
  it('maps user fields', () => {
    const result = toIdentity(makeUser() as any);
    expect(result.name).toBe('Alice Nguyen');
    expect(result.email).toBe('alice@example.com');
    expect(result.gender).toBe('female');
    expect(result.verified).toBe(true);
  });

  it('calculates age from date_of_birth', () => {
    const result = toIdentity(makeUser({ date_of_birth: '1990-01-01' }) as any);
    expect(result.age).toBeGreaterThan(30);
  });

  it('returns level 2 for completed onboarding', () => {
    const result = toIdentity(makeUser({ onboarding_status: 'completed' }) as any);
    expect(result.level).toBe(2);
  });

  it('returns level 1 for incomplete onboarding', () => {
    const result = toIdentity(makeUser({ onboarding_status: 'pending' }) as any);
    expect(result.level).toBe(1);
  });

  it('handles null user', () => {
    const result = toIdentity(null);
    expect(result.name).toBe('HealthOS user');
    expect(result.verified).toBe(false);
    expect(result.age).toBe(0);
  });

  it('sets Not set when fields missing', () => {
    const result = toIdentity(makeUser({ gender: undefined, address: undefined }) as any);
    expect(result.gender).toBe('Not set');
    expect(result.city).toBe('Not set');
  });
});

// ─── toProfileStats ───────────────────────────────────────────────────────────

describe('toProfileStats', () => {
  it('returns 3 stat rows', () => {
    const result = toProfileStats(makeUser() as any);
    expect(result).toHaveLength(3);
  });

  it('formats height and weight', () => {
    const result = toProfileStats(makeUser({ height_cm: 165.4, weight_kg: 58.6 }) as any);
    expect(result[0].value).toBe('165 cm');
    expect(result[1].value).toBe('59 kg');
  });

  it('shows dash when fields missing', () => {
    const result = toProfileStats(makeUser({ height_cm: null, weight_kg: null }) as any);
    expect(result[0].value).toBe('-');
    expect(result[1].value).toBe('-');
  });
});

// ─── formatDate / formatTime ──────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns Not scheduled for null', () => {
    expect(formatDate(null)).toBe('Not scheduled');
    expect(formatDate(undefined)).toBe('Not scheduled');
  });

  it('returns -- for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('--');
  });

  it('formats a valid ISO date to a non-empty string', () => {
    const result = formatDate('2026-01-15T00:00:00Z');
    expect(result).not.toBe('--');
    expect(result).not.toBe('Not scheduled');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatTime', () => {
  it('returns -- for null', () => {
    expect(formatTime(null)).toBe('--');
    expect(formatTime(undefined)).toBe('--');
  });

  it('returns -- for invalid time', () => {
    expect(formatTime('bad-value')).toBe('--');
  });

  it('formats a valid ISO datetime', () => {
    const result = formatTime('2026-06-02T08:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
