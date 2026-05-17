import { apiRequest } from '../client';
import type { DataResponse, RiskSummary } from '../../../../shared/api-contracts';

export const riskService = {
  async summary() {
    const response = await apiRequest<DataResponse<RiskSummary>>('/v1/health/risk-predictions');
    return response.data;
  },

  async refresh() {
    const response = await apiRequest<DataResponse<RiskSummary>>('/v1/health/risk-predictions', {
      method: 'POST',
      timeoutMs: 60000,
    });
    return response.data;
  },
};
