/* eslint-env jest */
import { reportService } from '../api/services/report-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: jest.requireActual('../api/client').buildQuery,
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('reportService', () => {
  it('requests batch trend analysis through the existing Core report endpoint', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { blood_pressure: { trend: 'declining' } } });

    await expect(reportService.trendsBatch(['blood_pressure', 'bmi'], '30d')).resolves.toEqual({
      blood_pressure: { trend: 'declining' },
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/reports/trends/batch?metrics=blood_pressure%2Cbmi&period=30d');
  });
});
