/* eslint-env jest */
import { buildMedicationPauseBody } from '../components/meds/pause-medication-payload';

describe('buildMedicationPauseBody', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');

  it('builds an indefinite pause body with trimmed reason', () => {
    expect(buildMedicationPauseBody('manual', '', '  Side effects  ', now)).toEqual({
      body: {
        pause_until: null,
        pause_reason: 'Side effects',
      },
    });
  });

  it('builds preset pause_until timestamps', () => {
    expect(buildMedicationPauseBody('three_days', '', '', now)).toEqual({
      body: {
        pause_until: '2026-06-04T00:00:00.000Z',
        pause_reason: null,
      },
    });
  });

  it('validates custom resume dates', () => {
    expect(buildMedicationPauseBody('custom', '', '', now)).toEqual({
      errorKey: 'meds.pauseCustomDateRequired',
    });
    expect(buildMedicationPauseBody('custom', '2026-02-31', '', now)).toEqual({
      errorKey: 'meds.pauseCustomDateInvalid',
    });
    expect(buildMedicationPauseBody('custom', '2026-05-30', '', now)).toEqual({
      errorKey: 'meds.pauseCustomDatePast',
    });

    const result = buildMedicationPauseBody('custom', '2026-06-03', 'travel', now);
    expect('body' in result && result.body.pause_until).toBeTruthy();
    expect('body' in result && result.body.pause_reason).toBe('travel');
  });
});
