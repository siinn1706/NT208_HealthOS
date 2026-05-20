/* eslint-env jest */
import { mealService } from '../api/services/meal-service';
import { apiRequest, createUploadFormData } from '../api/client';

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
  createUploadFormData: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockCreateUploadFormData = createUploadFormData as jest.MockedFunction<typeof createUploadFormData>;

beforeEach(() => jest.clearAllMocks());

describe('mealService photo analysis', () => {
  it('creates a meal with multipart image upload', async () => {
    const form = { _parts: [] } as unknown as FormData;
    const meal = {
      id: 'meal-1',
      name: 'Lunch',
      image_url: 'https://cdn.test/meal.jpg',
      job_id: 'job-1',
      status: 'pending',
      nutrition_result: null,
      logged_at: '2026-05-20T12:00:00.000Z',
      created_at: '2026-05-20T12:00:00.000Z',
    };
    const file = { uri: 'file:///meal.jpg', name: 'meal.jpg', type: 'image/jpeg' };
    mockCreateUploadFormData.mockReturnValueOnce(form);
    mockApiRequest.mockResolvedValueOnce({ data: meal });

    const result = await mealService.create({
      name: 'Lunch',
      logged_at: '2026-05-20T12:00:00.000Z',
      image: file,
    });

    expect(mockCreateUploadFormData).toHaveBeenCalledWith(
      { name: 'Lunch', logged_at: '2026-05-20T12:00:00.000Z' },
      { fieldName: 'image', ...file },
    );
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/meals', {
      method: 'POST',
      body: form,
    });
    expect(result).toEqual(meal);
  });

  it('checks meal analysis status by meal id', async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 'ready', job_id: 'job-1' });

    await expect(mealService.analysisStatus('meal/1')).resolves.toEqual({ status: 'ready', job_id: 'job-1' });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/meals/meal%2F1/analysis-status');
  });

  it('checks analysis status by job id', async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 'processing', job_id: 'job/1' });

    await expect(mealService.analysisStatusByJob('job/1')).resolves.toEqual({ status: 'processing', job_id: 'job/1' });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/meals/analyze-photo/job%2F1');
  });
});
