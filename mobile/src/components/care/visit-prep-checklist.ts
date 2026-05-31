import type { AppointmentPrepChecklistItem } from '../../../../shared/api-contracts';

export const VISIT_PREP_CHECKLIST_ITEMS = [
  'Bring insurance card',
  'List current medications',
  'Write down questions',
  'Confirm appointment time',
  'Arrange transport',
  'Fast if required',
  'Bring ID',
];

export function visitPrepChecklistId(label: string, index: number) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${index + 1}-${slug}`;
}

export function buildVisitPrepChecklist(checked: boolean[]): AppointmentPrepChecklistItem[] {
  return VISIT_PREP_CHECKLIST_ITEMS.map((label, index) => ({
    id: visitPrepChecklistId(label, index),
    label,
    checked: Boolean(checked[index]),
  }));
}

export function mergeSavedVisitPrepChecklist(savedItems: AppointmentPrepChecklistItem[]): boolean[] {
  const savedById = new Map(savedItems.map((item) => [item.id, item.checked]));
  return VISIT_PREP_CHECKLIST_ITEMS.map((label, index) => (
    savedById.get(visitPrepChecklistId(label, index)) ?? false
  ));
}
