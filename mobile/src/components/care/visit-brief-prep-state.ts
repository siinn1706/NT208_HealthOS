import type { QuestionItem, QuestionTemplate, TriageBucket, VisitBriefDetail, VisitType } from '../../types/api';

const VISIT_TYPES: VisitType[] = ['gp_routine', 'specialist', 'follow_up', 'mental_health', 'urgent_walkin', 'pediatric_caregiver'];

export function normalizeVisitType(value?: string | null): VisitType {
  return VISIT_TYPES.includes(value as VisitType) ? value as VisitType : 'gp_routine';
}

export function bucketLabel(bucket: TriageBucket | undefined) {
  const labels: Record<TriageBucket, string> = {
    emergency_now: 'Emergency now',
    urgent_same_day: 'Urgent same day',
    routine_gp: 'Routine GP',
    self_care_with_monitoring: 'Self care',
    insufficient_info: 'More info needed',
  };
  return bucket ? labels[bucket] : 'Not routed';
}

export function templateToQuestion(template: QuestionTemplate, index: number): QuestionItem {
  return {
    id: template.slug || template.id,
    source: 'template',
    text_vi: template.text_vi,
    text_en: template.text_en,
    order: index,
    locked: template.is_canonical,
  };
}

export function canFinalizeBrief(brief: VisitBriefDetail | null | undefined) {
  return Boolean(brief?.symptoms.length && brief.question_set?.questions.length);
}
