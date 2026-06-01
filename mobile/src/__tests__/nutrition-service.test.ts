/* eslint-env jest */
import { nutritionService } from '../api/services/nutrition-service';
import { apiRequest } from '../api/client';

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

beforeEach(() => jest.clearAllMocks());

describe('nutritionService', () => {
  it('loads bilingual ingredient catalog results through Core nutrition endpoint', async () => {
    const items = [{
      id: 'ingredient-1',
      slug: 'pho-bo',
      name_vi: 'Phở bò',
      name_en: 'Beef pho',
      category: 'staple',
      calories_per_100g: 215,
      protein_per_100g: 12.4,
      carbs_per_100g: 28.2,
      fat_per_100g: 5.8,
      unit_hint: 'serving',
      name_en_verified: true,
    }];
    mockApiRequest.mockResolvedValueOnce({ data: items, meta: { page: 1, per_page: 8, total: 1 } });

    await expect(nutritionService.ingredients({ q: 'pho', per_page: 8 })).resolves.toEqual(items);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/nutrition/ingredients?q=pho&per_page=8');
  });
});
