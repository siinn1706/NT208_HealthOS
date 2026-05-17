import { apiRequest } from '../client';
import type { CurrentUser, DataResponse, UserProfileUpdate } from '../../../../shared/api-contracts';

export const profileService = {
  async me() {
    const response = await apiRequest<DataResponse<CurrentUser>>('/v1/users/me');
    return response.data;
  },

  async updateMe(body: UserProfileUpdate) {
    const response = await apiRequest<DataResponse<CurrentUser>>('/v1/users/me', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },
};
