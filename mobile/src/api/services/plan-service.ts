import { apiRequest, buildQuery } from '../client';

export interface WellnessPlan {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  items: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface PlanListMeta {
  next_cursor: string | null;
  has_more: boolean;
  per_page: number;
}

interface PlanListResponse {
  data: WellnessPlan[];
  meta: PlanListMeta;
}

interface PlanResponse {
  data: WellnessPlan;
}

const DEFAULT_PLAN_PAGE_SIZE = 100;

export interface PlanListParams {
  status?: string;
  perPage?: number;
  cursor?: string | null;
}

export interface PlanCreateBody {
  title: string;
  category?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  items?: Record<string, unknown>[] | null;
}

export type PlanUpdateBody = Partial<PlanCreateBody>;

async function listPlanPage(params: PlanListParams = {}) {
  return apiRequest<PlanListResponse>(`/v1/plans${buildQuery({
    status: params.status,
    per_page: params.perPage,
    cursor: params.cursor,
  })}`);
}

function matchesActiveCategory(plan: WellnessPlan, category: string) {
  return plan.category === category && plan.status === 'active' && !plan.archived_at;
}

export const planService = {
  listPage: listPlanPage,

  async list(params: PlanListParams = {}) {
    const response = await listPlanPage(params);
    return response.data;
  },

  async findActiveByCategory(category: string, params: Pick<PlanListParams, 'perPage'> = {}) {
    let cursor: string | null | undefined;
    do {
      const response = await listPlanPage({
        status: 'active',
        perPage: params.perPage ?? DEFAULT_PLAN_PAGE_SIZE,
        cursor,
      });
      const found = response.data.find((plan) => matchesActiveCategory(plan, category));
      if (found) return found;
      cursor = response.meta.next_cursor;
      if (!response.meta.has_more) return null;
    } while (cursor);
    return null;
  },

  async create(body: PlanCreateBody) {
    const response = await apiRequest<PlanResponse>('/v1/plans', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async update(planId: string, body: PlanUpdateBody) {
    const response = await apiRequest<PlanResponse>(`/v1/plans/${encodeURIComponent(planId)}`, {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },
};
