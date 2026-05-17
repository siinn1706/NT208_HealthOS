import { apiRequest } from '../client';
import type { DataResponse, UserPreference } from '../../../../shared/api-contracts';

export const preferenceService = {
  async me() {
    const response = await apiRequest<DataResponse<UserPreference>>('/v1/preferences/me');
    return response.data;
  },

  async update(body: Partial<UserPreference>) {
    const response = await apiRequest<DataResponse<UserPreference>>('/v1/preferences/me', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },
};
