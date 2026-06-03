import { apiRequest, buildQuery } from '../client';
import type {
  AppointmentBriefLink,
  ConcernCategory,
  DataResponse,
  PaginatedResponse,
  QuestionItem,
  QuestionSet,
  QuestionTemplate,
  SymptomEntry,
  TriageOutcome,
  VisitBrief,
  VisitBriefDetail,
  VisitBriefStatus,
  VisitType,
} from '../../types/api';

type VisitBriefResponse = DataResponse<VisitBriefDetail>;
type SymptomEntryResponse = DataResponse<SymptomEntry>;
type TriageOutcomeResponse = DataResponse<TriageOutcome>;
type QuestionSetResponse = DataResponse<QuestionSet>;
type QuestionTemplateResponse = DataResponse<QuestionTemplate[]>;
type AppointmentBriefLinkResponse = DataResponse<AppointmentBriefLink>;

export interface VisitBriefListParams {
  status?: VisitBriefStatus | null;
  page?: number;
  perPage?: number;
}

export interface VisitBriefCreateBody {
  visit_type?: VisitType;
  title?: string | null;
  attach_to_appointment_id?: string | null;
  clone_from_brief_id?: string | null;
}

export interface SymptomEntryCreateBody {
  concern_text: string;
  concern_category?: ConcernCategory;
  onset_date?: string | null;
  duration_value?: number | null;
  duration_unit?: SymptomEntry['duration_unit'];
  severity_0_10?: number | null;
  triggers?: string | null;
  better_with?: string | null;
  worse_with?: string | null;
  meds_taken?: string | null;
  prior_care?: string | null;
  context?: Record<string, unknown> | null;
}

function visitBriefListPath(params: VisitBriefListParams = {}) {
  return `/api/v1/visit-briefs${buildQuery({
    status: params.status,
    page: params.page ?? 1,
    per_page: params.perPage ?? 50,
  })}`;
}

function hasActiveAppointmentLink(brief: VisitBriefDetail, appointmentId: string) {
  return brief.appointment_links.some((link) => link.is_active && link.appointment_id === appointmentId);
}

async function listVisitBriefPage(params: VisitBriefListParams = {}) {
  return apiRequest<PaginatedResponse<VisitBrief>>(visitBriefListPath(params));
}

async function getVisitBrief(briefId: string) {
  const response = await apiRequest<VisitBriefResponse>(`/api/v1/visit-briefs/${encodeURIComponent(briefId)}`);
  return response.data;
}

export const visitBriefService = {
  listPage: listVisitBriefPage,

  async list(params: VisitBriefListParams = {}) {
    const response = await listVisitBriefPage(params);
    return response.data;
  },

  async findAttachedToAppointment(appointmentId: string, params: Pick<VisitBriefListParams, 'perPage'> = {}) {
    const perPage = params.perPage ?? 50;
    let page = 1;
    let total = 0;
    do {
      const response = await listVisitBriefPage({ page, perPage });
      total = response.meta.total;
      for (const item of response.data) {
        if (item.status === 'archived') continue;
        const detail = await getVisitBrief(item.id);
        if (hasActiveAppointmentLink(detail, appointmentId)) return detail;
      }
      page += 1;
    } while ((page - 1) * perPage < total);
    return null;
  },

  get: getVisitBrief,

  async create(body: VisitBriefCreateBody) {
    const response = await apiRequest<VisitBriefResponse>('/api/v1/visit-briefs', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async update(briefId: string, body: { visit_type?: VisitType; title?: string | null }) {
    const response = await apiRequest<VisitBriefResponse>(`/api/v1/visit-briefs/${encodeURIComponent(briefId)}`, {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },

  async finalize(briefId: string) {
    const response = await apiRequest<VisitBriefResponse>(`/api/v1/visit-briefs/${encodeURIComponent(briefId)}/finalize`, {
      method: 'POST',
    });
    return response.data;
  },

  async addSymptom(briefId: string, body: SymptomEntryCreateBody) {
    const response = await apiRequest<SymptomEntryResponse>(`/api/v1/visit-briefs/${encodeURIComponent(briefId)}/symptoms`, {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async routeNow(briefId: string) {
    const response = await apiRequest<TriageOutcomeResponse>(
      `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/route-now`,
      { method: 'POST' },
    );
    return response.data;
  },

  async suggestedQuestions(
    briefId: string,
    params: { visitType?: VisitType | null; concernCategory?: ConcernCategory | null } = {},
  ) {
    const response = await apiRequest<QuestionTemplateResponse>(
      `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/questions/suggested${buildQuery({
        visit_type: params.visitType,
        concern_category: params.concernCategory,
      })}`,
    );
    return response.data;
  },

  async replaceQuestions(briefId: string, questions: QuestionItem[]) {
    const response = await apiRequest<QuestionSetResponse>(`/api/v1/visit-briefs/${encodeURIComponent(briefId)}/questions`, {
      method: 'PATCH',
      json: { questions },
    });
    return response.data;
  },

  async attachToAppointment(briefId: string, appointmentId: string) {
    const response = await apiRequest<AppointmentBriefLinkResponse>(
      `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/attach`,
      {
        method: 'POST',
        json: { appointment_id: appointmentId },
      },
    );
    return response.data;
  },
};
