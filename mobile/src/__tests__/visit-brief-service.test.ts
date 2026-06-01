/* eslint-env jest */
import { apiRequest, buildQuery } from '../api/client';
import { visitBriefService } from '../api/services/visit-brief-service';
import type { VisitBriefDetail } from '../types/api';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: jest.fn((params: Record<string, unknown>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    const text = search.toString();
    return text ? `?${text}` : '';
  }),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockBuildQuery = buildQuery as jest.MockedFunction<typeof buildQuery>;

const brief = (id: string, appointmentId?: string): VisitBriefDetail => ({
  id,
  user_id: 'user-1',
  visit_type: 'gp_routine',
  status: 'draft',
  revision: 1,
  title: 'Visit prep',
  finalized_at: null,
  archived_at: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
  symptoms: [],
  latest_triage: null,
  question_set: null,
  appointment_links: appointmentId
    ? [{
      id: `link-${id}`,
      visit_brief_id: id,
      appointment_id: appointmentId,
      is_active: true,
      attached_at: '2026-06-01T00:00:00.000Z',
      detached_at: null,
    }]
    : [],
});

describe('visitBriefService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists visit briefs with Core pagination params', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [brief('brief-1')], meta: { page: 2, per_page: 25, total: 30 } } as never);

    await expect(visitBriefService.list({ status: 'draft', page: 2, perPage: 25 })).resolves.toHaveLength(1);

    expect(mockBuildQuery).toHaveBeenCalledWith({ status: 'draft', page: 2, per_page: 25 });
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/visit-briefs?status=draft&page=2&per_page=25');
  });

  it('creates an appointment-attached draft through Core', async () => {
    const created = brief('brief-1', 'apt-1');
    const body = { visit_type: 'gp_routine' as const, title: 'Visit prep', attach_to_appointment_id: 'apt-1' };
    mockApiRequest.mockResolvedValueOnce({ data: created } as never);

    await expect(visitBriefService.create(body)).resolves.toEqual(created);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/visit-briefs', {
      method: 'POST',
      json: body,
    });
  });

  it('finds an active appointment-linked brief across list pages', async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        data: [{ ...brief('brief-1'), appointment_links: undefined }],
        meta: { page: 1, per_page: 1, total: 2 },
      } as never)
      .mockResolvedValueOnce({ data: brief('brief-1') } as never)
      .mockResolvedValueOnce({
        data: [{ ...brief('brief-2'), appointment_links: undefined }],
        meta: { page: 2, per_page: 1, total: 2 },
      } as never)
      .mockResolvedValueOnce({ data: brief('brief-2', 'apt-1') } as never);

    await expect(visitBriefService.findAttachedToAppointment('apt-1', { perPage: 1 })).resolves.toMatchObject({
      id: 'brief-2',
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/visit-briefs?page=1&per_page=1');
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/visit-briefs/brief-1');
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, '/v1/visit-briefs?page=2&per_page=1');
    expect(mockApiRequest).toHaveBeenNthCalledWith(4, '/v1/visit-briefs/brief-2');
  });

  it('updates questions and finalizes through the existing visit-brief endpoints', async () => {
    const question = {
      id: 'q-1',
      source: 'template' as const,
      text_vi: 'Can hoi ve dau dau?',
      text_en: 'Ask about headaches?',
      order: 0,
      locked: false,
    };
    mockApiRequest
      .mockResolvedValueOnce({ data: [{ id: 'tpl-1', slug: 'q-1', visit_type: 'gp_routine', concern_category: null, text_vi: question.text_vi, text_en: question.text_en, default_order: 0, is_canonical: false }] } as never)
      .mockResolvedValueOnce({ data: { id: 'set-1', visit_brief_id: 'brief-1', questions: [question], updated_at: '2026-06-01T00:00:00.000Z' } } as never)
      .mockResolvedValueOnce({ data: { ...brief('brief-1'), status: 'finalized' } } as never);

    await expect(visitBriefService.suggestedQuestions('brief-1', { visitType: 'gp_routine' })).resolves.toHaveLength(1);
    await expect(visitBriefService.replaceQuestions('brief-1', [question])).resolves.toMatchObject({ id: 'set-1' });
    await expect(visitBriefService.finalize('brief-1')).resolves.toMatchObject({ status: 'finalized' });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/visit-briefs/brief-1/questions/suggested?visit_type=gp_routine');
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/visit-briefs/brief-1/questions', {
      method: 'PATCH',
      json: { questions: [question] },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, '/v1/visit-briefs/brief-1/finalize', {
      method: 'POST',
    });
  });
});
