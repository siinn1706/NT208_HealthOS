import {
  buildVisitPrepChecklist,
  mergeSavedVisitPrepChecklist,
  visitPrepChecklistId,
} from '../components/care/visit-prep-checklist';

describe('visit prep checklist helpers', () => {
  it('builds stable checklist ids and checked state', () => {
    const items = buildVisitPrepChecklist([true, false, true]);

    expect(items[0]).toEqual({
      id: '1-bring-insurance-card',
      label: 'Bring insurance card',
      checked: true,
    });
    expect(items[1].checked).toBe(false);
    expect(items[2].checked).toBe(true);
  });

  it('merges persisted checks by stable id', () => {
    const checked = mergeSavedVisitPrepChecklist([
      { id: visitPrepChecklistId('Bring ID', 6), label: 'Bring ID', checked: true },
      { id: 'unknown', label: 'Unknown', checked: true },
    ]);

    expect(checked.slice(0, 6)).toEqual([false, false, false, false, false, false]);
    expect(checked[6]).toBe(true);
  });
});
