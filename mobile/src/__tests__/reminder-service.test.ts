/* eslint-env jest */
import { reminderService, resolveReminderActionError } from '../api/services/reminder-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: (params: Record<string, string | number | boolean | null | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) qs.set(key, String(value));
    });
    const text = qs.toString();
    return text ? `?${text}` : '';
  },
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('reminderService', () => {
  it('maps 404/no matching occurrence as occurrence-missing', () => {
    expect(
      resolveReminderActionError(
        { status: 404, code: 'NOT_FOUND', message: 'No matching occurrence found.' },
        'markDone',
      ),
    ).toBe('occurrenceMissing');
    expect(
      resolveReminderActionError(
        { status: 404, code: 'NOT_FOUND', message: 'No matching occurrence found.' },
        'snooze',
      ),
    ).toBe('occurrenceMissing');
  });

  it('maps 422/snooze validation payload issues to invalid payload', () => {
    expect(
      resolveReminderActionError(
        { status: 422, code: 'VALIDATION_ERROR', message: 'Validation failed' },
        'snooze',
      ),
    ).toBe('invalidSnoozePayload');
    expect(
      resolveReminderActionError(
        { message: 'Provide either until or minutes.' },
        'snooze',
      ),
    ).toBe('invalidSnoozePayload');
  });

  it('maps unknown errors to generic', () => {
    expect(resolveReminderActionError({ message: 'Boom' }, 'markDone')).toBe('generic');
  });

  it('maps occurrence message text to occurrenceMissing even without status code', () => {
    expect(
      resolveReminderActionError({ message: 'No matching occurrence for this reminder.' }, 'markDone'),
    ).toBe('occurrenceMissing');
  });

  it('maps snooze-specific message text to invalidSnoozePayload', () => {
    expect(
      resolveReminderActionError({ message: 'Provide either until or minutes.' }, 'snooze'),
    ).toBe('invalidSnoozePayload');
    expect(
      resolveReminderActionError({ message: 'Snooze requires a time or duration.' }, 'snooze'),
    ).toBe('invalidSnoozePayload');
  });

  it('handles string status codes by parsing them as numbers', () => {
    expect(
      resolveReminderActionError({ status: '404', code: 'NOT_FOUND', message: '' }, 'markDone'),
    ).toBe('occurrenceMissing');
    expect(
      resolveReminderActionError({ status: '422', code: 'VALIDATION_ERROR', message: '' }, 'snooze'),
    ).toBe('invalidSnoozePayload');
  });

  it('handles Error objects via errorText', () => {
    expect(
      resolveReminderActionError(new Error('No matching occurrence found'), 'markDone'),
    ).toBe('occurrenceMissing');
  });

  it('returns empty string from errorText for null error', () => {
    expect(resolveReminderActionError(null, 'markDone')).toBe('generic');
  });

  it('lists reminders with Core reminder types', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] } as never);

    await expect(reminderService.list('medicine')).resolves.toEqual([]);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/reminders?type=medicine');
  });

  it('creates reminders with repeat and weekday contract fields', async () => {
    const body = {
      type: 'medicine' as const,
      title: 'Morning dose',
      time: '07:30',
      repeat: 'weekly' as const,
      note: null,
      tzid: 'Asia/Ho_Chi_Minh',
      weekday_mask: 31,
    };
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'rem-1', ...body } } as never);

    await reminderService.create(body);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/reminders', {
      method: 'POST',
      json: body,
    });
  });

  it('queries occurrences with supported filters', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] } as never);

    await reminderService.occurrences({
      today: true,
      tzid: 'Asia/Ho_Chi_Minh',
      status: 'pending,done',
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/v1/reminders/occurrences?today=true&tzid=Asia%2FHo_Chi_Minh&status=pending%2Cdone',
    );
  });

  it('posts occurrence actions to reminder action endpoints', async () => {
    mockApiRequest.mockResolvedValue({ data: { id: 'occ-1' } } as never);

    await reminderService.markDone('rem/1', 'occ/1');
    await reminderService.skip('rem/1', 'occ/1');
    await reminderService.snooze('rem/1', { minutes: 15, occurrence_id: 'occ/1' });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/reminders/rem%2F1/done', {
      method: 'POST',
      json: { occurrence_id: 'occ/1' },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/reminders/rem%2F1/skip', {
      method: 'POST',
      json: { occurrence_id: 'occ/1' },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, '/v1/reminders/rem%2F1/snooze', {
      method: 'POST',
      json: { minutes: 15, occurrence_id: 'occ/1' },
    });
  });

  it('deletes and legacy-updates reminders through encoded ids', async () => {
    mockApiRequest.mockResolvedValue({ data: { id: 'rem/1' } } as never);

    await reminderService.updateDone('rem/1', true);
    await reminderService.delete('rem/1');

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/v1/reminders/rem%2F1', {
      method: 'PATCH',
      json: { done: true },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/v1/reminders/rem%2F1', {
      method: 'DELETE',
    });
  });
});
