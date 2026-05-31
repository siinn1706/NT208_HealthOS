import { apiRequest } from '../client';
import type {
  AccountDeletionRequestBody,
  AccountDeletionResult,
  AccountRestoreResult,
  CurrentUser,
  DataResponse,
  UserProfileUpdate,
} from '../../types/api';

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

  async requestAccountDeletion(body: AccountDeletionRequestBody) {
    const response = await apiRequest<DataResponse<AccountDeletionResult>>('/v1/users/me', {
      method: 'DELETE',
      json: body,
    });
    return response.data;
  },

  async restoreAccount() {
    const response = await apiRequest<DataResponse<AccountRestoreResult>>('/v1/users/me/restore', {
      method: 'POST',
    });
    return response.data;
  },
};
