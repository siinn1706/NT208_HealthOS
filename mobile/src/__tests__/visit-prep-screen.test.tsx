/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { VisitPrepScreen } from '../components/care/visit-prep-screen';
import { appointmentService, visitBriefService } from '../api/services';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import type { VisitBriefDetail } from '../types/api';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  appointmentService: {
    detail: jest.fn(),
    getPrep: jest.fn(),
    updatePrep: jest.fn(),
  },
  visitBriefService: {
    findAttachedToAppointment: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    addSymptom: jest.fn(),
    suggestedQuestions: jest.fn(),
    replaceQuestions: jest.fn(),
    routeNow: jest.fn(),
    finalize: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'apt-1' }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockUpdatePrep = appointmentService.updatePrep as jest.MockedFunction<typeof appointmentService.updatePrep>;
const mockFindAttachedBrief = visitBriefService.findAttachedToAppointment as jest.MockedFunction<typeof visitBriefService.findAttachedToAppointment>;
const mockCreateBrief = visitBriefService.create as jest.MockedFunction<typeof visitBriefService.create>;
const mockGetBrief = visitBriefService.get as jest.MockedFunction<typeof visitBriefService.get>;
const mockAddSymptom = visitBriefService.addSymptom as jest.MockedFunction<typeof visitBriefService.addSymptom>;
const mockSuggestedQuestions = visitBriefService.suggestedQuestions as jest.MockedFunction<typeof visitBriefService.suggestedQuestions>;
const mockReplaceQuestions = visitBriefService.replaceQuestions as jest.MockedFunction<typeof visitBriefService.replaceQuestions>;
const mockRouteNow = visitBriefService.routeNow as jest.MockedFunction<typeof visitBriefService.routeNow>;
const mockFinalizeBrief = visitBriefService.finalize as jest.MockedFunction<typeof visitBriefService.finalize>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

const appointmentQueryState = {
  ...baseQueryState,
  data: {
    id: 'apt-1',
    doctor_name: 'Dr Prep',
    specialty: 'Primary care',
    appointment_date: '2026-06-02T09:00:00.000Z',
  },
};

const visitBrief: VisitBriefDetail = {
  id: 'brief-1',
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
  appointment_links: [{
    id: 'link-1',
    visit_brief_id: 'brief-1',
    appointment_id: 'apt-1',
    is_active: true,
    attached_at: '2026-06-01T00:00:00.000Z',
    detached_at: null,
  }],
};

const headacheSymptom = {
  id: 'symptom-1',
  visit_brief_id: 'brief-1',
  concern_text: 'Headache',
  concern_category: 'other',
  onset_date: null,
  duration_value: null,
  duration_unit: null,
  severity_0_10: null,
  triggers: null,
  better_with: null,
  worse_with: null,
  meds_taken: null,
  prior_care: null,
  context: null,
  order_index: 0,
} as const;

const questionSet = {
  id: 'set-1',
  visit_brief_id: 'brief-1',
  questions: [{
    id: 'ask-meds',
    source: 'template' as const,
    text_vi: 'Toi can hoi ve thuoc nao?',
    text_en: 'Which medications should I ask about?',
    order: 0,
    locked: false,
  }],
  updated_at: '2026-06-01T00:00:00.000Z',
};

const readyVisitBrief: VisitBriefDetail = {
  ...visitBrief,
  symptoms: [headacheSymptom],
  question_set: questionSet,
};

function mockQueries(prepState: any, briefState: any = { ...baseQueryState, data: null }) {
  mockUseApiQuery.mockImplementation((key) => {
    if (key === queryKeys.appointmentPrep('apt-1')) return prepState as never;
    if (key === queryKeys.visitBriefForAppointment('apt-1')) return briefState as never;
    return appointmentQueryState as never;
  });
}

describe('VisitPrepScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAttachedBrief.mockResolvedValue(null);
  });

  it('does not let a late prep GET overwrite local checklist edits', () => {
    let prepQueryState: any = {
      ...baseQueryState,
      data: null,
    };
    mockQueries(prepQueryState);

    const { getByText, rerender } = render(<VisitPrepScreen />);

    fireEvent.press(getByText('Bring insurance card'));
    expect(StyleSheet.flatten(getByText('Bring insurance card').props.style).textDecorationLine).toBe('line-through');

    prepQueryState = {
      ...baseQueryState,
      data: {
        appointment_id: 'apt-1',
        checklist_items: [
          { id: '1-bring-insurance-card', label: 'Bring insurance card', checked: false },
        ],
        notes: null,
        updated_at: '2026-05-30T00:00:00.000Z',
      },
    };
    rerender(<VisitPrepScreen />);

    expect(StyleSheet.flatten(getByText('Bring insurance card').props.style).textDecorationLine).toBe('line-through');
  });

  it('saves prep checklist through Core, invalidates prep cache, and reloads saved prep', async () => {
    const reloadPrep = jest.fn().mockResolvedValue(undefined);
    mockUpdatePrep.mockResolvedValue({
      appointment_id: 'apt-1',
      checklist_items: [
        { id: '1-bring-insurance-card', label: 'Bring insurance card', checked: true },
      ],
      notes: null,
      updated_at: '2026-05-31T10:00:00.000Z',
    });
    mockQueries({ ...baseQueryState, data: null, reload: reloadPrep });

    const { getByText } = render(<VisitPrepScreen />);

    fireEvent.press(getByText('Bring insurance card'));
    fireEvent.press(getByText('Save checklist'));

    await waitFor(() => {
      expect(mockUpdatePrep).toHaveBeenCalledWith('apt-1', {
        checklist_items: expect.arrayContaining([
          { id: '1-bring-insurance-card', label: 'Bring insurance card', checked: true },
        ]),
      });
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.appointmentPrep('apt-1'));
    expect(reloadPrep).toHaveBeenCalled();
  });

  it('creates a Core visit brief attached to the appointment', async () => {
    mockCreateBrief.mockResolvedValue(visitBrief as never);
    mockQueries({ ...baseQueryState, data: null });

    const { getByText } = render(<VisitPrepScreen />);
    fireEvent.press(getByText('Create clinical brief'));

    await waitFor(() => {
      expect(mockCreateBrief).toHaveBeenCalledWith({
        visit_type: 'gp_routine',
        title: 'Visit prep: Dr Prep',
        attach_to_appointment_id: 'apt-1',
      });
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.visitBriefForAppointment('apt-1'));
  });

  it('does not create duplicate drafts on rapid create taps', async () => {
    let resolveCreate: (brief: VisitBriefDetail) => void = () => {};
    mockCreateBrief.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve;
    }) as never);
    mockQueries({ ...baseQueryState, data: null });

    const { getByText } = render(<VisitPrepScreen />);
    const createButton = getByText('Create clinical brief');
    fireEvent.press(createButton);
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockFindAttachedBrief).toHaveBeenCalledTimes(1);
      expect(mockCreateBrief).toHaveBeenCalledTimes(1);
    });
    resolveCreate(visitBrief);
    await waitFor(() => {
      expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.visitBriefForAppointment('apt-1'));
    });
  });

  it('reuses an attached brief found immediately before create', async () => {
    mockFindAttachedBrief.mockResolvedValueOnce(visitBrief);
    mockQueries({ ...baseQueryState, data: null });

    const { getByText } = render(<VisitPrepScreen />);
    fireEvent.press(getByText('Create clinical brief'));

    await waitFor(() => {
      expect(mockCreateBrief).not.toHaveBeenCalled();
      expect(getByText('Clinical brief already exists.')).toBeTruthy();
    });
  });

  it('adds a concern and routes the current visit brief', async () => {
    mockAddSymptom.mockResolvedValue(headacheSymptom as never);
    mockGetBrief.mockResolvedValue({ ...visitBrief, symptoms: [headacheSymptom] } as never);
    mockRouteNow.mockResolvedValue({
      id: 'triage-1',
      visit_brief_id: 'brief-1',
      ruleset_version: 'v1',
      bucket: 'routine_gp',
      matched_signals: [],
      inputs_hash: 'hash',
      disclaimer_version: 'v1',
      next_action_copy_key: null,
      computed_at: '2026-06-01T00:00:00.000Z',
    } as never);
    mockQueries({ ...baseQueryState, data: null }, { ...baseQueryState, data: visitBrief });

    const { getByPlaceholderText, getByText } = render(<VisitPrepScreen />);
    fireEvent.changeText(getByPlaceholderText('Main concern'), 'Headache');
    fireEvent.press(getByText('Add concern'));

    await waitFor(() => {
      expect(mockAddSymptom).toHaveBeenCalledWith('brief-1', {
        concern_text: 'Headache',
        concern_category: 'other',
      });
      expect(mockGetBrief).toHaveBeenCalledWith('brief-1');
    });

    fireEvent.press(getByText('Route now'));
    await waitFor(() => {
      expect(mockRouteNow).toHaveBeenCalledWith('brief-1');
    });
  });

  it('saves suggested questions and finalizes an existing visit brief', async () => {
    mockSuggestedQuestions.mockResolvedValue([{
      id: 'tpl-1',
      slug: 'ask-meds',
      visit_type: 'gp_routine',
      concern_category: null,
      text_vi: 'Toi can hoi ve thuoc nao?',
      text_en: 'Which medications should I ask about?',
      default_order: 0,
      is_canonical: false,
    }] as never);
    mockReplaceQuestions.mockResolvedValue(questionSet as never);
    mockFinalizeBrief.mockResolvedValue({ ...readyVisitBrief, status: 'finalized' } as never);
    mockQueries({ ...baseQueryState, data: null }, { ...baseQueryState, data: readyVisitBrief });

    const { getByText } = render(<VisitPrepScreen />);
    fireEvent.press(getByText('Questions'));

    await waitFor(() => {
      expect(mockReplaceQuestions).toHaveBeenCalledWith('brief-1', questionSet.questions);
    });

    fireEvent.press(getByText('Finalize'));
    await waitFor(() => {
      expect(mockFinalizeBrief).toHaveBeenCalledWith('brief-1');
    });
  });

  it('keeps finalize disabled until the brief has a concern and question', () => {
    mockQueries({ ...baseQueryState, data: null }, { ...baseQueryState, data: visitBrief });

    const { getByText } = render(<VisitPrepScreen />);
    fireEvent.press(getByText('Finalize'));

    expect(mockFinalizeBrief).not.toHaveBeenCalled();
    expect(getByText('Add one concern and one question before finalizing.')).toBeTruthy();
  });

  it('surfaces finalize API errors when Core rejects the request', async () => {
    mockFinalizeBrief.mockRejectedValue(new Error('Finalization requirements unmet.'));
    mockQueries({ ...baseQueryState, data: null }, { ...baseQueryState, data: readyVisitBrief });

    const { getByText } = render(<VisitPrepScreen />);
    fireEvent.press(getByText('Finalize'));

    await waitFor(() => {
      expect(getByText('Visit brief action failed')).toBeTruthy();
      expect(getByText('Finalization requirements unmet.')).toBeTruthy();
    });
  });
});
